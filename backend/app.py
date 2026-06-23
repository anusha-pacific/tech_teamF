from pathlib import Path
import csv
import json
from functools import lru_cache

from flask import Flask, jsonify, request
from flask_cors import CORS
from pyproj import Transformer


APP_DIR = Path(__file__).resolve().parent
DATA_DIR = APP_DIR / "data" if (APP_DIR / "data").exists() else APP_DIR.parent / "data"
GEOJSON_DIR = DATA_DIR / "geojson"
GTFS_DIR = DATA_DIR / "gtfs"
PREFERRED_MESH_FILES = [
    GEOJSON_DIR / "mesh_hospital_nearest_wide.geojson",
    GEOJSON_DIR / "mesh_population.geojson",
]

app = Flask(__name__)
CORS(app)


def mesh_path():
    for path in PREFERRED_MESH_FILES:
        if path.exists():
            return path
    return PREFERRED_MESH_FILES[-1]


def read_json(path: Path):
    if not path.exists():
        return {"type": "FeatureCollection", "features": []}

    with path.open("r", encoding="utf-8") as fp:
        return json.load(fp)


def source_epsg(payload):
    crs_name = (
        payload.get("crs", {})
        .get("properties", {})
        .get("name", "")
    )
    if "EPSG::32653" in crs_name or "EPSG:32653" in crs_name:
        return 32653
    return 4326


def transform_coordinates(coordinates, transformer):
    if not coordinates:
        return coordinates

    if isinstance(coordinates[0], (int, float)):
        lon, lat = transformer.transform(coordinates[0], coordinates[1])
        return [lon, lat, *coordinates[2:]]

    return [transform_coordinates(item, transformer) for item in coordinates]


def transform_feature_geometry(feature, transformer):
    geometry = feature.get("geometry")
    if not geometry:
        return
    geometry["coordinates"] = transform_coordinates(geometry.get("coordinates"), transformer)


def parse_number(value):
    if value in (None, "", "*"):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def first_value_by_suffix(properties, suffix, prefix=None):
    for key, value in properties.items():
        if key.endswith(suffix) and (prefix is None or key.startswith(prefix)):
            parsed = parse_number(value)
            if parsed is not None:
                return parsed
    return None


def min_stop_distance_by_mode(properties, mode_name=None):
    distances = []
    for key, value in properties.items():
        if not key.endswith("_source_stop_distance_m"):
            continue

        distance = parse_number(value)
        if distance is None:
            continue

        modes = str(properties.get(key.replace("_distance_m", "_modes"), "")).lower()
        if mode_name is None or mode_name in modes:
            distances.append(distance)

    return min(distances) if distances else None


def ordered_population_value(properties, offset):
    keys = list(properties.keys())
    if "OBJ_ID" not in properties:
        return None
    index = keys.index("OBJ_ID") + offset
    if index >= len(keys):
        return None
    return parse_number(properties.get(keys[index]))


def add_normalized_mesh_properties(feature):
    properties = feature.get("properties") or {}
    feature["properties"] = properties

    properties.setdefault("population", ordered_population_value(properties, 1))
    properties.setdefault("elderly_population", ordered_population_value(properties, 2))
    properties.setdefault("elderly_rate", ordered_population_value(properties, 8))

    distance_aliases = {
        "nearest_1ji_hospital_m": ("1_nearest_1", "_mesh_to_hospital_straight_distance_m"),
        "second_nearest_1ji_hospital_m": ("2_nearest_1", "_mesh_to_hospital_straight_distance_m"),
        "nearest_2ji_hospital_m": ("1_nearest_2", "_mesh_to_hospital_straight_distance_m"),
        "second_nearest_2ji_hospital_m": ("2_nearest_2", "_mesh_to_hospital_straight_distance_m"),
        "nearest_2_5ji_hospital_m": ("1_nearest_2.5", "_mesh_to_hospital_straight_distance_m"),
        "second_nearest_2_5ji_hospital_m": ("2_nearest_2.5", "_mesh_to_hospital_straight_distance_m"),
        "nearest_3ji_hospital_m": ("1_nearest_3", "_mesh_to_hospital_straight_distance_m"),
        "second_nearest_3ji_hospital_m": ("2_nearest_3", "_mesh_to_hospital_straight_distance_m"),
    }

    for alias, (prefix, suffix) in distance_aliases.items():
        properties.setdefault(alias, first_value_by_suffix(properties, suffix, prefix))

    medical_values = [
        properties.get("nearest_1ji_hospital_m"),
        properties.get("nearest_2ji_hospital_m"),
        properties.get("nearest_2_5ji_hospital_m"),
        properties.get("nearest_3ji_hospital_m"),
    ]
    numeric_medical_values = [value for value in medical_values if value is not None]
    properties.setdefault(
        "nearest_medical_m",
        min(numeric_medical_values) if numeric_medical_values else None,
    )
    properties.setdefault("nearest_bus_stop_m", min_stop_distance_by_mode(properties, "bus"))
    properties.setdefault("nearest_train_stop_m", min_stop_distance_by_mode(properties, "train"))
    properties.setdefault("nearest_public_transport_m", min_stop_distance_by_mode(properties))

    geometry = feature.get("geometry") or {}
    if geometry.get("type") == "Point":
        coordinates = geometry.get("coordinates") or []
        if len(coordinates) >= 2:
            properties.setdefault("centroid_lon", coordinates[0])
            properties.setdefault("centroid_lat", coordinates[1])


@lru_cache(maxsize=1)
def read_mesh_layer():
    payload = read_json(mesh_path())
    epsg = source_epsg(payload)

    if epsg != 4326:
        transformer = Transformer.from_crs(f"EPSG:{epsg}", "EPSG:4326", always_xy=True)
        for feature in payload.get("features", []):
            transform_feature_geometry(feature, transformer)
        payload["crs"] = {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:EPSG::4326"},
        }

    for feature in payload.get("features", []):
        add_normalized_mesh_properties(feature)

    return payload


def safe_float(value):
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def feature_collection_from_gtfs_stops():
    stops_path = GTFS_DIR / "stops.txt"
    if not stops_path.exists():
        return {"type": "FeatureCollection", "features": []}

    features = []
    with stops_path.open("r", encoding="utf-8-sig", newline="") as fp:
        for row in csv.DictReader(fp):
            lon = safe_float(row.get("stop_lon"))
            lat = safe_float(row.get("stop_lat"))
            if lon is None or lat is None:
                continue

            features.append(
                {
                    "type": "Feature",
                    "properties": {
                        "stop_id": row.get("stop_id"),
                        "stop_name": row.get("stop_name"),
                        "location_type": row.get("location_type"),
                        "source": "gtfs",
                    },
                    "geometry": {"type": "Point", "coordinates": [lon, lat]},
                }
            )

    return {"type": "FeatureCollection", "features": features}


def get_prop(properties, *names, default=None):
    for name in names:
        value = properties.get(name)
        if value is not None:
            return value
    return default


def calculate_score(properties):
    existing_score = safe_float(properties.get("score"))
    if existing_score is not None:
        return existing_score

    elderly_rate = safe_float(properties.get("elderly_rate")) or 0
    medical_distance = safe_float(
        get_prop(properties, "nearest_medical_m", "nearest_1ji_hospital_m")
    ) or 0
    transport_distance = safe_float(
        get_prop(properties, "nearest_public_transport_m", "nearest_bus_stop_m")
    ) or 0

    return round(
        min(100, elderly_rate * 0.6 + medical_distance / 100 + transport_distance / 100),
        1,
    )


def is_candidate(properties, options):
    elderly_rate = safe_float(properties.get("elderly_rate")) or 0
    score = calculate_score(properties)

    hospital_field = options.get("hospitalField", "nearest_medical_m")
    medical_distance = safe_float(
        get_prop(properties, hospital_field, "nearest_medical_m", "nearest_1ji_hospital_m")
    )
    bus_distance = safe_float(properties.get("nearest_bus_stop_m"))
    train_distance = safe_float(properties.get("nearest_train_stop_m"))

    medical_radius = float(options.get("medicalRadiusM", 1000))
    bus_radius = float(options.get("busRadiusM", 300))
    train_radius = float(options.get("trainRadiusM", 500))
    public_radius = float(options.get("publicTransportRadiusM", 500))
    elderly_threshold = float(options.get("elderlyRateThreshold", 35))
    score_threshold = float(options.get("scoreThreshold", 70))
    merge_public = bool(options.get("mergePublicTransport", False))

    outside_medical = medical_distance is None or medical_distance > medical_radius

    if merge_public:
        distances = [d for d in [bus_distance, train_distance] if d is not None]
        nearest_public = min(distances) if distances else None
        outside_public = nearest_public is None or nearest_public > public_radius
    else:
        outside_bus = bus_distance is None or bus_distance > bus_radius
        outside_train = train_distance is None or train_distance > train_radius
        outside_public = outside_bus and outside_train

    return elderly_rate >= elderly_threshold and outside_medical and outside_public and score >= score_threshold


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/api/layers/mesh")
def mesh_layer():
    return jsonify(read_mesh_layer())


@app.get("/api/layers/hospitals")
def hospitals_layer():
    return jsonify(read_json(GEOJSON_DIR / "hospitals.geojson"))


@app.get("/api/layers/stations")
def stations_layer():
    return jsonify(read_json(GEOJSON_DIR / "stations.geojson"))


@app.get("/api/layers/bus-stops")
def bus_stops_layer():
    toyama_stops = GEOJSON_DIR / "toyama_stops.geojson"
    if toyama_stops.exists():
        return jsonify(read_json(toyama_stops))

    bus_geojson = GEOJSON_DIR / "bus_stops.geojson"
    if bus_geojson.exists():
        return jsonify(read_json(bus_geojson))
    return jsonify(feature_collection_from_gtfs_stops())


@app.post("/api/analyze/access-difficulty")
def access_difficulty():
    options = request.get_json(silent=True) or {}
    mesh = read_mesh_layer()
    features = []

    for feature in mesh.get("features", []):
        properties = feature.get("properties", {})
        if is_candidate(properties, options):
            copied = dict(feature)
            copied["properties"] = {
                **properties,
                "score": calculate_score(properties),
                "access_difficulty_candidate": True,
            }
            features.append(copied)

    return jsonify({"type": "FeatureCollection", "features": features})
