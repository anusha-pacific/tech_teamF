# Team F Medical Access Dashboard

Dockerized Flask + Leaflet dashboard for exploring 500m population mesh, medical facilities, public transport, buffers, and medical access difficulty candidates.

## Requirements

- Docker Desktop on Windows with the WSL 2 backend enabled
- Git

## Run Locally

```powershell
docker compose up --build
```

Open:

- Frontend: http://localhost:5173
- Backend health check: http://localhost:5000/api/health

## Data Files

Place your real files here:

```text
data/
  geojson/
    mesh_population.geojson
    hospitals.geojson
    stations.geojson
    bus_stops.geojson
  gtfs/
    stops.txt
```

If `data/geojson/bus_stops.geojson` is missing, the backend will try to read GTFS `data/gtfs/stops.txt`.

## Mesh Properties

The dashboard expects numeric values where possible:

```json
{
  "mesh_id": "xxxx",
  "population": 123,
  "elderly_rate": 38.2,
  "centroid_lon": 139.7,
  "centroid_lat": 35.6,
  "nearest_1ji_hospital_m": 850,
  "nearest_2ji_hospital_m": 1300,
  "nearest_3ji_hospital_m": 4200,
  "nearest_medical_m": 850,
  "nearest_bus_stop_m": 280,
  "nearest_train_stop_m": 620,
  "nearest_public_transport_m": 280,
  "score": 82.4
}
```

Use `null` for unknown distances, not empty strings.

## API Endpoints

- `GET /api/health`
- `GET /api/layers/mesh`
- `GET /api/layers/hospitals`
- `GET /api/layers/stations`
- `GET /api/layers/bus-stops`
- `POST /api/analyze/access-difficulty`

## Performance Approach

The map draws visual buffers dynamically with Leaflet circles. Candidate mesh extraction uses precomputed nearest-distance fields, so changing radius sliders is a fast numeric filter instead of a heavy polygon buffer/intersection operation.
