import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Activity, Hospital, Layers, TrainFront } from "lucide-react";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const initialControls = {
  colorMode: "elderly",
  showMesh: true,
  showHospitals: true,
  showStations: true,
  showBusStops: true,
  showMedicalBuffers: false,
  showTransportBuffers: false,
  showCandidates: true,
  elderlyRateThreshold: 35,
  medicalRadiusM: 1000,
  trainRadiusM: 500,
  busRadiusM: 500,
  mergePublicTransport: false,
  publicTransportRadiusM: 500,
  scoreThreshold: 4,
  hospitalField: "nearest_medical_m",
  stopModeVisibility: {},
  meshOpacity: 48,
  pointOpacity: 88,
  bufferOpacity: 16,
};

const TOYAMA_VIEW = {
  center: [36.6953, 137.2113],
  zoom: 10,
};

const MESH_EQUAL_AREA_RADIUS_M = Math.sqrt((500 * 500) / Math.PI);

const messages = {
  en: {
    appEyebrow: "Team F Dashboard",
    appTitle: "Medical Access Map",
    language: "Language",
    languageLabel: "Display language",
    english: "English",
    japanese: "Japanese",
    populationMesh: "Population Mesh",
    showMesh: "Show 500m mesh",
    elderlyRate: "65+ rate",
    population: "Population",
    elderlyThreshold: "Elderly threshold",
    medical: "Medical",
    showHospitals: "Show hospitals / clinics",
    showMedicalBuffer: "Show medical buffer",
    medicalDistanceField: "Medical distance field",
    nearestMedical: "Nearest medical",
    nearest1ji: "Nearest 1ji hospital",
    nearest2ji: "Nearest 2ji hospital",
    nearest25ji: "Nearest 2.5ji hospital",
    nearest3ji: "Nearest 3ji hospital",
    medicalRadius: "Medical radius",
    publicTransport: "Public Transport",
    layerOpacity: "Layer opacity",
    pointOpacity: "Point opacity",
    bufferOpacity: "Buffer opacity",
    showTrainStations: "Show train stations",
    showToyamaStops: "Show Toyama stops",
    showTransportBuffers: "Show transport buffers",
    mergeTransport: "Merge bus and train analysis",
    stopTypes: "Stop types",
    bus: "Bus",
    tramLightRail: "Tram / light rail",
    rail: "Rail",
    train: "Train",
    unknown: "Unknown",
    mergedRadius: "Merged radius",
    trainRadius: "Train radius",
    busRadius: "Bus radius",
    analysis: "Analysis",
    highlightCandidates: "Highlight access difficulty candidates",
    scoreThreshold: "Score threshold",
    candidateMeshes: "Candidate meshes",
    loadingLayers: "Loading layers...",
    loadingDetail: "Reading GeoJSON and preparing map layers",
    updatingMap: "Updating map...",
    updatingDetail: "Applying filters and redrawing layers",
    ready: "Ready for your GeoJSON and GTFS files.",
    apiError: "API error",
    candidate: "Candidate",
    higherElderlyRate: "Higher 65+ rate",
    transport: "Transport",
    meshScaleNote: "Mesh centroids shown as equal-area 500m mesh circles",
    medicalBufferLegend: "Medical buffer",
    transportBufferLegend: "Transport buffer",
    busStopsLegend: "Bus stops",
    tramStopsLegend: "Tram / light rail stops",
    stationsLegend: "Train stations",
    hospitalsLegend: "Hospitals / clinics",
  },
  ja: {
    appEyebrow: "Team F ダッシュボード",
    appTitle: "医療アクセスマップ",
    language: "言語",
    languageLabel: "表示言語",
    english: "英語",
    japanese: "日本語",
    populationMesh: "人口メッシュ",
    showMesh: "500mメッシュを表示",
    elderlyRate: "65歳以上割合",
    population: "人口",
    elderlyThreshold: "高齢者割合しきい値",
    medical: "医療",
    showHospitals: "病院・診療所を表示",
    showMedicalBuffer: "医療バッファを表示",
    medicalDistanceField: "医療距離の種類",
    nearestMedical: "最寄り医療施設",
    nearest1ji: "最寄り1次医療",
    nearest2ji: "最寄り2次医療",
    nearest25ji: "最寄り2.5次医療",
    nearest3ji: "最寄り3次医療",
    medicalRadius: "医療半径",
    publicTransport: "公共交通",
    showTrainStations: "鉄道駅を表示",
    showToyamaStops: "富山県停留所を表示",
    showTransportBuffers: "交通バッファを表示",
    mergeTransport: "バス・鉄道を統合して判定",
    stopTypes: "停留所タイプ",
    bus: "バス",
    tramLightRail: "路面電車・ライトレール",
    rail: "鉄道",
    train: "鉄道",
    unknown: "不明",
    mergedRadius: "統合半径",
    trainRadius: "鉄道半径",
    busRadius: "バス半径",
    analysis: "分析",
    highlightCandidates: "医療アクセス困難候補を強調",
    scoreThreshold: "スコアしきい値",
    candidateMeshes: "候補メッシュ",
    loadingLayers: "レイヤーを読み込み中...",
    loadingDetail: "GeoJSONを読み込み、地図レイヤーを準備しています",
    updatingMap: "地図を更新中...",
    updatingDetail: "フィルターを適用し、レイヤーを再描画しています",
    ready: "GeoJSON / GTFS データを表示できます。",
    apiError: "APIエラー",
    candidate: "候補",
    higherElderlyRate: "高い65歳以上割合",
    transport: "公共交通",
  },
};

function createTranslator(language) {
  return (key) => messages[language]?.[key] || messages.en[key] || key;
}

function formatNumber(value, suffix = "") {
  if (value === null || value === undefined || value === "") return "N/A";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return `${value}${suffix}`;
  return `${numeric.toLocaleString()}${suffix}`;
}

function getMeters(properties, field) {
  const value = properties?.[field];
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
}

function getMedicalDistance(properties, hospitalField) {
  return (
    getMeters(properties, hospitalField) ??
    getMeters(properties, "nearest_medical_m") ??
    getMeters(properties, "nearest_1ji_hospital_m")
  );
}

function getScore(properties) {
  const score = Number(properties?.score);
  if (!Number.isNaN(score)) return score;

  const elderlyRate = Number(properties?.elderly_rate) || 0;
  const medical = getMedicalDistance(properties, "nearest_medical_m") || 0;
  const transport = getMeters(properties, "nearest_public_transport_m") || getMeters(properties, "nearest_bus_stop_m") || 0;
  
  var score_elderly = ((elderlyRate>=.35)+(elderlyRate>=.4) ) 
  var score_transport = (transport>=500)
  var score_kourei = (medical>1000) 
  return score_elderly + score_transport + score_kourei;
}

function isCandidate(properties, controls) {
  const elderlyRate = Number(properties?.elderly_rate) || 0;
  const score = getScore(properties);
  const medicalDistance = getMedicalDistance(properties, controls.hospitalField);
  const busDistance = getMeters(properties, "nearest_bus_stop_m");
  const trainDistance = getMeters(properties, "nearest_train_stop_m");

  const outsideMedical = medicalDistance === null || medicalDistance > controls.medicalRadiusM;
  const outsidePublic = controls.mergePublicTransport
    ? Math.min(busDistance ?? Infinity, trainDistance ?? Infinity) > controls.publicTransportRadiusM
    : (busDistance === null || busDistance > controls.busRadiusM) &&
      (trainDistance === null || trainDistance > controls.trainRadiusM);

  return (
    // elderlyRate >= controls.elderlyRateThreshold &&
    // outsideMedical &&
    // outsidePublic &&
    (
      (controls.scoreThreshold===2 && (score === 1 || score === 2) ) || 
      (controls.scoreThreshold ===  score)
    )
  );
}

function meshColor(properties, controls) {
  if (controls.showCandidates && isCandidate(properties, controls)) return "#dc2626";

  if (controls.colorMode === "population") {
    const population = Number(properties?.population) || 0;
    if (population > 800) return "#7c2d12";
    if (population > 500) return "#c2410c";
    if (population > 250) return "#f97316";
    if (population > 0) return "#fdba74";
    return "#f3f4f6";
  }

  const elderlyRate = Number(properties?.elderly_rate) || 0;
  if (elderlyRate >= 45) return "#7f1d1d";
  if (elderlyRate >= 35) return "#b91c1c";
  if (elderlyRate >= 25) return "#f59e0b";
  if (elderlyRate > 0) return "#fde68a";
  return "#f3f4f6";
}

function meshPopup(feature, controls) {
  const p = feature.properties || {};
  const candidate = isCandidate(p, controls);
  return `
    <div class="map-popup">
      <h3>500m Mesh</h3>
      <dl>
        <dt>Mesh ID</dt><dd>${p.mesh_id ?? "N/A"}</dd>
        <dt>Population</dt><dd>${formatNumber(p.population)}</dd>
        <dt>65+ rate</dt><dd>${formatNumber(p.elderly_rate, "%")}</dd>
        <dt>Nearest medical</dt><dd>${formatNumber(getMedicalDistance(p, controls.hospitalField), " m")}</dd>
        <dt>Nearest 1ji hospital</dt><dd>${formatNumber(p.nearest_1ji_hospital_m, " m")}</dd>
        <dt>Nearest 2ji hospital</dt><dd>${formatNumber(p.nearest_2ji_hospital_m, " m")}</dd>
        <dt>Nearest 3ji hospital</dt><dd>${formatNumber(p.nearest_3ji_hospital_m, " m")}</dd>
        <dt>Nearest bus stop</dt><dd>${formatNumber(p.nearest_bus_stop_m, " m")}</dd>
        <dt>Nearest train station</dt><dd>${formatNumber(p.nearest_train_stop_m, " m")}</dd>
        <dt>Score</dt><dd>${formatNumber(getScore(p).toFixed(1))}</dd>
        <dt>Status</dt><dd>${candidate ? "Medical access difficulty candidate" : "Normal"}</dd>
      </dl>
    </div>
  `;
}

function pointPopup(feature, fallbackTitle) {
  const p = feature.properties || {};
  const rows = Object.entries(p)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => `<dt>${key}</dt><dd>${value}</dd>`)
    .join("");

  return `
    <div class="map-popup">
      <h3>${p.name || p.stop_name || fallbackTitle}</h3>
      <dl>${rows || "<dt>Info</dt><dd>No properties available</dd>"}</dl>
    </div>
  `;
}

function stopModes(feature) {
  const raw = feature?.properties?.route_modes || feature?.properties?.source || feature?.properties?.type || "unknown";
  return String(raw)
    .split(",")
    .map((mode) => mode.trim())
    .filter(Boolean);
}

function stopModeLabel(mode, t) {
  const labels = {
    bus: t("bus"),
    tram_light_rail: t("tramLightRail"),
    rail: t("rail"),
    train: t("train"),
    unknown: t("unknown"),
  };
  return labels[mode] || mode.replaceAll("_", " ");
}

function stopColor(feature) {
  const modes = stopModes(feature);
  if (modes.includes("tram_light_rail")) return { color: "#7c3aed", fillColor: "#a78bfa", radius: 5 };
  if (modes.includes("rail") || modes.includes("train")) return { color: "#0f766e", fillColor: "#2dd4bf", radius: 5 };
  return { color: "#1d4ed8", fillColor: "#60a5fa", radius: 4 };
}

function stopMatchesFilters(feature, visibility) {
  const modes = stopModes(feature);
  return modes.some((mode) => visibility[mode] !== false);
}

function ControlGroup({ icon: Icon, title, children }) {
  return (
    <section className="control-group">
      <h2>
        <Icon size={16} />
        {title}
      </h2>
      {children}
    </section>
  );
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="check-row">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function Range({ label, value, min, max, step = 1, suffix = "", onChange }) {
  return (
    <label className="range-row">
      <span>
        {label}
        <strong>{formatNumber(value, suffix)}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function App() {
  const mapRef = useRef(null);
  const layersRef = useRef({});
  const bufferRef = useRef({});
  const [controls, setControls] = useState(initialControls);
  const [appliedControls, setAppliedControls] = useState(initialControls);
  const [language, setLanguage] = useState("en");
  const [data, setData] = useState({ mesh: null, hospitals: null, stations: null, busStops: null });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const t = useMemo(() => createTranslator(language), [language]);

  const updateControl = useCallback((key, value) => {
    setProcessing(true);
    setControls((current) => ({ ...current, [key]: value }));
  }, []);

  useEffect(() => {
    const map = L.map("map", { zoomControl: false, preferCanvas: true }).setView(TOYAMA_VIEW.center, TOYAMA_VIEW.zoom);
    mapRef.current = map;

    [
      ["bufferPane", 390],
      ["meshPane", 430],
      ["stopPane", 500],
      ["stationPane", 520],
      ["medicalPane", 540],
    ].forEach(([name, zIndex]) => {
      map.createPane(name);
      map.getPane(name).style.zIndex = zIndex;
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    return () => map.remove();
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const [mesh, hospitals, stations, busStops] = await Promise.all([
          fetch(`${API_BASE_URL}/api/layers/mesh`).then((response) => response.json()),
          fetch(`${API_BASE_URL}/api/layers/hospitals`).then((response) => response.json()),
          fetch(`${API_BASE_URL}/api/layers/stations`).then((response) => response.json()),
          fetch(`${API_BASE_URL}/api/layers/bus-stops`).then((response) => response.json()),
        ]);

        if (mounted) {
          setData({ mesh, hospitals, stations, busStops });
          setError("");
        }
      } catch (loadError) {
        if (mounted) setError(loadError.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setProcessing(true);
    const timeoutId = window.setTimeout(() => {
      setAppliedControls(controls);
    }, 160);

    return () => window.clearTimeout(timeoutId);
  }, [controls]);

  const candidateCount = useMemo(() => {
    return data.mesh?.features?.filter((feature) => isCandidate(feature.properties, appliedControls)).length || 0;
  }, [data.mesh, appliedControls]);

  const stopModeOptions = useMemo(() => {
    const modes = new Set();
    data.busStops?.features?.forEach((feature) => stopModes(feature).forEach((mode) => modes.add(mode)));
    return Array.from(modes).sort();
  }, [data.busStops]);

  const filteredBusStops = useMemo(() => {
    if (!data.busStops) return null;
    return {
      ...data.busStops,
      features: data.busStops.features.filter((feature) => stopMatchesFilters(feature, appliedControls.stopModeVisibility)),
    };
  }, [data.busStops, appliedControls.stopModeVisibility]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data.mesh) return;

    setProcessing(true);

    const frameId = window.requestAnimationFrame(() => {
      Object.values(layersRef.current).forEach((layer) => layer.remove());
      Object.values(bufferRef.current).forEach((group) => group.remove());
      layersRef.current = {};
      bufferRef.current = {};

      if (appliedControls.showMesh) {
        const scoreFilteredMesh = {
          ...data.mesh,
          features: data.mesh.features.filter(
            (feature) => getScore(feature.properties) === appliedControls.scoreThreshold
          ),
        };

        layersRef.current.mesh = L.geoJSON(scoreFilteredMesh, {
      // if (appliedControls.showMesh) {
      //   layersRef.current.mesh = L.geoJSON(data.mesh, {
          pointToLayer: (feature, latlng) => {
            const candidate = isCandidate(feature.properties, appliedControls);
            return L.circle(latlng, {
              pane: "meshPane",
              radius: MESH_EQUAL_AREA_RADIUS_M,
              color: candidate ? "#991b1b" : "#374151",
              fillColor: meshColor(feature.properties, appliedControls),
              fillOpacity: (appliedControls.meshOpacity / 100) * (candidate ? 1 : 0.86),
              opacity: Math.min(1, appliedControls.meshOpacity / 100 + 0.24),
              weight: candidate ? 2 : 1,
            });
          },
          style: (feature) => ({
            color: isCandidate(feature.properties, appliedControls) ? "#991b1b" : "#374151",
            fillColor: meshColor(feature.properties, appliedControls),
            fillOpacity: appliedControls.meshOpacity / 100,
            opacity: Math.min(1, appliedControls.meshOpacity / 100 + 0.24),
            weight: isCandidate(feature.properties, appliedControls) ? 2 : 1,
            pane: "meshPane",
          }),
          onEachFeature: (feature, layer) => layer.bindPopup(() => meshPopup(feature, appliedControls)),
        }).addTo(map);
      }
      

      if (appliedControls.showHospitals && data.hospitals) {
        layersRef.current.hospitals = L.geoJSON(data.hospitals, {
          pointToLayer: (feature, latlng) =>
            L.circleMarker(latlng, {
              pane: "medicalPane",
              radius: 6,
              color: "#7f1d1d",
              fillColor: "#ef4444",
              fillOpacity: appliedControls.pointOpacity / 100,
              opacity: Math.min(1, appliedControls.pointOpacity / 100 + 0.12),
              weight: 2,
            }),
          onEachFeature: (feature, layer) => layer.bindPopup(() => pointPopup(feature, "Medical facility")),
        }).addTo(map);
      }

      if (appliedControls.showStations && data.stations) {
        layersRef.current.stations = L.geoJSON(data.stations, {
          pointToLayer: (feature, latlng) =>
            L.circleMarker(latlng, {
              pane: "stationPane",
              radius: 6,
              color: "#0f766e",
              fillColor: "#2dd4bf",
              fillOpacity: appliedControls.pointOpacity / 100,
              opacity: Math.min(1, appliedControls.pointOpacity / 100 + 0.12),
              weight: 2,
            }),
          onEachFeature: (feature, layer) => layer.bindPopup(() => pointPopup(feature, "Train station")),
        }).addTo(map);
      }

      if (appliedControls.showBusStops && filteredBusStops) {
        layersRef.current.busStops = L.geoJSON(filteredBusStops, {
          pointToLayer: (feature, latlng) => {
            const colors = stopColor(feature);
            return L.circleMarker(latlng, {
              pane: "stopPane",
              radius: colors.radius,
              color: colors.color,
              fillColor: colors.fillColor,
              fillOpacity: appliedControls.pointOpacity / 100,
              opacity: Math.min(1, appliedControls.pointOpacity / 100 + 0.12),
              weight: 1,
            });
          },
          onEachFeature: (feature, layer) => layer.bindPopup(() => pointPopup(feature, "Transport stop")),
        }).addTo(map);
      }

      if (appliedControls.showMedicalBuffers && data.hospitals) {
        const group = L.layerGroup();
        L.geoJSON(data.hospitals, {
          pointToLayer: (_feature, latlng) =>
            L.circle(latlng, {
              pane: "bufferPane",
              radius: appliedControls.medicalRadiusM,
              color: "#dc2626",
              fillColor: "#fecaca",
              fillOpacity: appliedControls.bufferOpacity / 100,
              opacity: Math.min(1, appliedControls.bufferOpacity / 100 + 0.18),
              weight: 1,
            }).addTo(group),
        });
        group.addTo(map);
        bufferRef.current.medical = group;
      }

      if (appliedControls.showTransportBuffers) {
        const group = L.layerGroup();
        const trainRadius = appliedControls.mergePublicTransport ? appliedControls.publicTransportRadiusM : appliedControls.trainRadiusM;
        const busRadius = appliedControls.mergePublicTransport ? appliedControls.publicTransportRadiusM : appliedControls.busRadiusM;

        if (data.stations) {
          L.geoJSON(data.stations, {
            pointToLayer: (_feature, latlng) =>
            L.circle(latlng, {
                pane: "bufferPane",
                radius: trainRadius,
                color: "#0f766e",
                fillColor: "#ccfbf1",
                fillOpacity: appliedControls.bufferOpacity / 100,
                opacity: Math.min(1, appliedControls.bufferOpacity / 100 + 0.18),
                weight: 1,
              }).addTo(group),
          });
        }

        if (filteredBusStops) {
          L.geoJSON(filteredBusStops, {
            pointToLayer: (_feature, latlng) =>
            L.circle(latlng, {
                pane: "bufferPane",
                radius: busRadius,
                color: "#2563eb",
                fillColor: "#bfdbfe",
                fillOpacity: appliedControls.bufferOpacity / 100,
                opacity: Math.min(1, appliedControls.bufferOpacity / 100 + 0.18),
                weight: 1,
              }).addTo(group),
          });
        }

        group.addTo(map);
        bufferRef.current.transport = group;
      }

      window.setTimeout(() => setProcessing(false), 80);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [data, appliedControls, filteredBusStops]);

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <header>
          <p>{t("appEyebrow")}</p>
          <h1>{t("appTitle")}</h1>
        </header>

        <ControlGroup icon={Layers} title={t("populationMesh")}>
          <Checkbox label={t("showMesh")} checked={controls.showMesh} onChange={(value) => updateControl("showMesh", value)} />
          <div className="segmented">
            <button className={controls.colorMode === "elderly" ? "active" : ""} onClick={() => updateControl("colorMode", "elderly")}>
              {t("elderlyRate")}
            </button>
            <button className={controls.colorMode === "population" ? "active" : ""} onClick={() => updateControl("colorMode", "population")}>
              {t("population")}
            </button>
          </div>
          <Range
            label={t("elderlyThreshold")}
            value={controls.elderlyRateThreshold}
            min={0}
            max={80}
            suffix="%"
            onChange={(value) => updateControl("elderlyRateThreshold", value)}
          />
        </ControlGroup>

        <ControlGroup icon={Hospital} title={t("medical")}>
          <Checkbox label={t("showHospitals")} checked={controls.showHospitals} onChange={(value) => updateControl("showHospitals", value)} />
          <Checkbox label={t("showMedicalBuffer")} checked={controls.showMedicalBuffers} onChange={(value) => updateControl("showMedicalBuffers", value)} />
          <label className="select-row">
            {t("medicalDistanceField")}
            <select value={controls.hospitalField} onChange={(event) => updateControl("hospitalField", event.target.value)}>
              <option value="nearest_medical_m">{t("nearestMedical")}</option>
              <option value="nearest_1ji_hospital_m">{t("nearest1ji")}</option>
              <option value="nearest_2ji_hospital_m">{t("nearest2ji")}</option>
              <option value="nearest_2_5ji_hospital_m">{t("nearest25ji")}</option>
              <option value="nearest_3ji_hospital_m">{t("nearest3ji")}</option>
            </select>
          </label>
          <Range
            label={t("medicalRadius")}
            value={controls.medicalRadiusM}
            min={100}
            max={5000}
            step={100}
            suffix=" m"
            onChange={(value) => updateControl("medicalRadiusM", value)}
          />
        </ControlGroup>

        <ControlGroup icon={TrainFront} title={t("publicTransport")}>
          <Checkbox label={t("showTrainStations")} checked={controls.showStations} onChange={(value) => updateControl("showStations", value)} />
          <Checkbox label={t("showToyamaStops")} checked={controls.showBusStops} onChange={(value) => updateControl("showBusStops", value)} />
          <Checkbox label={t("showTransportBuffers")} checked={controls.showTransportBuffers} onChange={(value) => updateControl("showTransportBuffers", value)} />
          <Checkbox label={t("mergeTransport")} checked={controls.mergePublicTransport} onChange={(value) => updateControl("mergePublicTransport", value)} />

          {stopModeOptions.length > 0 && (
            <div className="filter-list">
              <span>{t("stopTypes")}</span>
              {stopModeOptions.map((mode) => (
                <Checkbox
                  key={mode}
                  label={stopModeLabel(mode, t)}
                  checked={controls.stopModeVisibility[mode] !== false}
                  onChange={(value) =>
                    updateControl("stopModeVisibility", {
                      ...controls.stopModeVisibility,
                      [mode]: value,
                    })
                  }
                />
              ))}
            </div>
          )}

          {controls.mergePublicTransport ? (
            <Range
              label={t("mergedRadius")}
              value={controls.publicTransportRadiusM}
              min={100}
              max={3000}
              step={100}
              suffix=" m"
              onChange={(value) => updateControl("publicTransportRadiusM", value)}
            />
          ) : (
            <>
              <Range label={t("trainRadius")} value={controls.trainRadiusM} min={100} max={3000} step={100} suffix=" m" onChange={(value) => updateControl("trainRadiusM", value)} />
              <Range label={t("busRadius")} value={controls.busRadiusM} min={100} max={3000} step={100} suffix=" m" onChange={(value) => updateControl("busRadiusM", value)} />
            </>
          )}
        </ControlGroup>

        <ControlGroup icon={Activity} title={t("analysis")}>
          <Checkbox label={t("highlightCandidates")} checked={controls.showCandidates} onChange={(value) => updateControl("showCandidates", value)} />
          {/* <Range label={t("scoreThreshold")} value={controls.scoreThreshold} min={0} max={4} suffix="" onChange={(value) => updateControl("scoreThreshold", value)} /> */}
            <label className="select-row">
              {t("scoreThreshold")}
              <select
                value={controls.scoreThreshold}
                onChange={(event) => updateControl("scoreThreshold", Number(event.target.value))}
              >
                <option value={0}>アクセス良好地域</option>
                <option value={2}>要観察地域</option>
                <option value={3}>優先対応地域</option>
                <option value={4}>最優先対応地域</option>
              </select>
            </label>
          <div className="stat-card">
            <span>{t("candidateMeshes")}</span>
            <strong>{candidateCount}</strong>
          </div>
        </ControlGroup>

        <footer>
          {loading && <span>{t("loadingLayers")}</span>}
          {!loading && processing && <span>{t("updatingMap")}</span>}
          {error && <span className="error">{t("apiError")}: {error}</span>}
          {!loading && !processing && !error && <span>{t("ready")}</span>}
        </footer>
      </aside>

      <main className="map-shell">
        <div id="map" />
        <div className="language-toggle" aria-label={t("languageLabel")}>
          <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>
            EN
          </button>
          <button className={language === "ja" ? "active" : ""} onClick={() => setLanguage("ja")}>
            日本語
          </button>
        </div>
        {(loading || processing) && (
          <div className="loading-overlay" role="status" aria-live="polite">
            <div className="loading-panel">
              <div className="spinner" />
              <strong>{loading ? t("loadingLayers") : t("updatingMap")}</strong>
              <span>{loading ? t("loadingDetail") : t("updatingDetail")}</span>
            </div>
          </div>
        )}
        <div className="legend">
          <span><i className="candidate" /> {t("candidate")}</span>
          <span><i className="elderly" /> {t("higherElderlyRate")}</span>
          <span><i className="transport" /> {t("transport")}</span>
          <span><i className="medical" /> {t("medical")}</span>
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
