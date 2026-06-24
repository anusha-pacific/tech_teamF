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
  // showHospitals: true,
  hospitalVisibilityMode: "all",
  showStations: false,
  showBusStops: false,
  showMedicalBuffers: false,
  showTransportBuffers: false,
  showCandidates: true,
  elderlyRateThreshold: 35,
  medicalRadiusM: 1000,
  trainRadiusM: 500,
  busRadiusM: 500,
  mergePublicTransport: false,
  publicTransportRadiusM: 500,
  scoreThreshold: -1,
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
const HOSPITAL_MARKER_RADIUS_M = Math.sqrt((500 * 500) / Math.PI);
const STOPS_MARKER_RADIUS_M = Math.sqrt((520 * 520) / Math.PI);

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
    scoreThreshold: "Medical Access Difficulty Filter",
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
    noFilter: "Show all",
    accessPriority: "Medical Access Priority",
    accessPriorityFilter: "Medical Access Priority Filter",
    status: "Status",
    normal: "Normal",
    medicalAccessDifficultyCandidate: "Medical access difficulty candidate",

    meshId: "Mesh ID",
    nearestBusStop: "Nearest bus stop",
    nearestTrainStation: "Nearest train station",

    hospitals: "Hospitals",
    primaryHospital: "Primary hospital",
    secondaryHospital: "Secondary hospital",
    level25Hospital: "2.5-level hospital",
    tertiaryHospital: "Tertiary hospital",
    unknownHospitalType: "Unknown hospital type",

    hospitalDisplay: "Hospital display",
    showAllHospitals: "Show all hospitals",
    showNoHospitals: "Show none",
    showGeneralHospitals: "Show general / unclassified",
    show1jiHospitals: "Show 1ji hospitals",
    show2jiHospitals: "Show 2ji hospitals",
    show25jiHospitals: "Show 2.5ji hospitals",
    show3jiHospitals: "Show 3ji hospitals",

    scoreVeryHighPriority: "Highest-priority support area",
    scoreHighPriority: "Priority support area",
    scoreWatchArea: "Monitoring area",
    scoreGoodAccess: "Good access area",

    elderlyRate85: "65+ rate ≥ 85%",
    elderlyRate65: "65+ rate ≥ 65%",
    elderlyRate45: "65+ rate ≥ 45%",
    elderlyRate35: "65+ rate ≥ 35%",
    elderlyRate25: "65+ rate ≥ 25%",
    elderlyRatePositive: "65+ rate > 0%",
    noElderlyData: "No elderly data",

    population800: "Population > 800",
    population500: "Population > 500",
    population250: "Population > 250",
    populationPositive: "Population > 0",
    noPopulation: "No population",
    population600Plus: "Population ≥ 600",
    population100To600: "Population 100–599",
    population50To100: "Population 50–99",
    population0To50: "Population 0-50",

    railTrain: "Rail / Train",

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
    scoreThreshold: "アクセス困難度絞る",
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

    noFilter: "絞らない",
    accessPriority: "医療アクセス優先度",
    accessPriorityFilter: "医療アクセス優先度で絞る",
    status: "状態",
    normal: "通常",
    medicalAccessDifficultyCandidate: "医療アクセス困難候補",

    meshId: "メッシュID",
    nearestBusStop: "最寄りバス停",
    nearestTrainStation: "最寄り鉄道駅",

    hospitals: "病院・診療所",
    primaryHospital: "一次医療施設",
    secondaryHospital: "二次医療施設",
    level25Hospital: "2.5次医療施設",
    tertiaryHospital: "三次医療施設",
    unknownHospitalType: "医療施設種別不明",
    hospitalDisplay: "医療施設の表示",
    showAllHospitals: "すべて表示",
    showNoHospitals: "表示しない",
    showGeneralHospitals: "一般・未分類を表示",
    show1jiHospitals: "1次医療施設を表示",
    show2jiHospitals: "2次医療施設を表示",
    show25jiHospitals: "2.5次医療施設を表示",
    show3jiHospitals: "3次医療施設を表示",

    scoreVeryHighPriority: "最優先対応地域",
    scoreHighPriority: "優先対応地域",
    scoreWatchArea: "要観察地域",
    scoreGoodAccess: "アクセス良好地域",

    elderlyRate85: "65歳以上割合 ≥ 85%",
    elderlyRate65: "65歳以上割合 ≥ 65%",
    elderlyRate45: "65歳以上割合 ≥ 45%",
    elderlyRate35: "65歳以上割合 ≥ 35%",
    elderlyRate25: "65歳以上割合 ≥ 25%",
    elderlyRatePositive: "65歳以上割合 > 0%",
    noElderlyData: "高齢者データなし",

    population800: "人口 > 800",
    population500: "人口 > 500",
    population250: "人口 > 250",
    populationPositive: "人口 > 0",
    noPopulation: "人口データなし",
    population600Plus: "人口 600以上",
    population100To600: "人口 100〜599",
    population50To100: "人口 50〜99",
    population0To50: "人口 0〜50",

    railTrain: "鉄道",
  },
};

const HOSPITAL_TYPE_STYLES = {
  "1": {
    color: "#2563eb",
    fillColor: "#60a5fa",
    labelKey: "primaryHospital",
  },
  "2": {
    color: "#16a34a",
    fillColor: "#86efac",
    labelKey: "secondaryHospital",
  },
  "2.5": {
    color: "#f59e0b",
    fillColor: "#fde68a",
    labelKey: "level25Hospital",
  },
  "3": {
    color: "#7f1d1d",
    fillColor: "#ef4444",
    labelKey: "tertiaryHospital",
  },
};

function hospitalType(feature) {
  return String(feature.properties?.type_ji ?? "0").trim();
}

function hospitalMatchesVisibilityMode(feature, mode) {
  const type = hospitalType(feature);

  if (mode === "none") return false;
  if (mode === "all") return true;

  return type === mode;
}

function getHospitalTypeStyle(properties) {
  const type = String(properties?.type_ji ?? "").trim();

  return (
    HOSPITAL_TYPE_STYLES[type] || {
      color: "#6b7280",
      fillColor: "#d1d5db",
      labelKey: "unknownHospitalType",
    }
  );
}

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

function minValidMeters(properties, fields) {
  const values = fields
    .map((field) => getMeters(properties, field))
    .filter((value) => value !== null && value !== undefined && !Number.isNaN(value));

  return values.length > 0 ? Math.min(...values) : null;
}

function getMedicalDistance(properties, hospitalField) {
  if (hospitalField === "nearest_medical_m") {
    return minValidMeters(properties, [
      "1_nearest_1次_mesh_to_hospital_straight_distance_m",
      "1_nearest_2次_mesh_to_hospital_straight_distance_m",
      "1_nearest_2.5次_mesh_to_hospital_straight_distance_m",
      "1_nearest_3次_mesh_to_hospital_straight_distance_m",
    ]);
  }

  return getMeters(properties, hospitalField);
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

function matchScore(score,control_score_thresh){
  return ( (control_score_thresh===-1) ||
      (control_score_thresh===2 && (score === 1 || score === 2) ) || 
      (control_score_thresh ===  score)
    )
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
      // console.log(controls.scoreThreshold,controls.scoreThreshold===-1)

  return (
    // elderlyRate >= controls.elderlyRateThreshold &&
    // outsideMedical &&
    // outsidePublic &&
    matchScore(score, controls.scoreThreshold)
    // ( (controls.scoreThreshold===-1) ||
    //   (controls.scoreThreshold===2 && (score === 1 || score === 2) ) || 
    //   (controls.scoreThreshold ===  score)
    // )
  );
}

const SCORE_COLOR_RULES = [
  { score: 4, color: "#dc2626", labelKey: "scoreVeryHighPriority" },
  { score: 3, color: "#e68416", labelKey: "scoreHighPriority" },
  { score: 2, color: "#ece912", labelKey: "scoreWatchArea" },
  { score: 1, color: "#ece912", labelKey: "scoreWatchArea" },
  { score: 0, color: "#33e90f", labelKey: "scoreGoodAccess" },
];

const SCORE_LEGEND_ITEMS = [
  { key: "score-4", color: "#dc2626", labelKey: "scoreVeryHighPriority" },
  { key: "score-3", color: "#e68416", labelKey: "scoreHighPriority" },
  { key: "score-1-2", color: "#ece912", labelKey: "scoreWatchArea" },
  { key: "score-0", color: "#33e90f", labelKey: "scoreGoodAccess" },
];

const ELDERLY_COLOR_RULES = [
  { key: "elderly-85", color: "#581845", labelKey: "elderlyRate85" },
  { key: "elderly-65", color: "#900c3f", labelKey: "elderlyRate65" },
  { key: "elderly-45", color: "#c70039", labelKey: "elderlyRate45" },
  { key: "elderly-35", color: "#ff5733", labelKey: "elderlyRate35" },
  { key: "elderly-25", color: "#ffc300", labelKey: "elderlyRate25" },
  { key: "elderly-positive", color: "#fff3b0", labelKey: "elderlyRatePositive" },
  { key: "elderly-none", color: "#f3f4f6", labelKey: "noElderlyData" },
];

const POPULATION_COLOR_RULES = [
  { key: "population-600", color: "#7c2d12", labelKey: "population600Plus" },
  { key: "population-100-600", color: "#c2410c", labelKey: "population100To600" },
  { key: "population-50-100", color: "#f97316", labelKey: "population50To100" },
  { key: "population-0-50", color: "#fdba74", labelKey: "population0To50" },
  { key: "population-none", color: "#f3f4f6", labelKey: "noPopulation" },
];

// const SCORE_COLOR_RULES = [
//   { score: 4, color: "#dc2626", label: "最優先対応地域" },
//   { score: 3, color: "#e68416", label: "優先対応地域" },
//   { score: 2, color: "#ece912", label: "" },
//   { score: 1, color: "#ece912", label: "要観察地域" },
//   { score: 0, color: "#33e90f", label: "アクセス良好地域" },
// ];

// const ELDERLY_COLOR_RULES = [
//   { color: "#7f1d1d", label: "65+ rate ≥ 45%" },
//   { color: "#b91c1c", label: "65+ rate ≥ 35%" },
//   { color: "#f59e0b", label: "65+ rate ≥ 25%" },
//   { color: "#fde68a", label: "65+ rate > 0%" },
//   { color: "#f3f4f6", label: "No elderly data" },
// ];

// const POPULATION_COLOR_RULES = [
//   { color: "#7c2d12", label: "Population > 800" },
//   { color: "#c2410c", label: "Population > 500" },
//   { color: "#f97316", label: "Population > 250" },
//   { color: "#fdba74", label: "Population > 0" },
//   { color: "#f3f4f6", label: "No population" },
// ];

function matchColorScore(actualScore, targetScore) {
  return Number(actualScore) === Number(targetScore);
}

function getScoreColor(score) {
  return SCORE_COLOR_RULES.find((rule) => matchColorScore(score, rule.score))?.color || "#26c1dc";
}

function getMeshLegendItems(controls) {
  if (controls.showCandidates) {
    return SCORE_LEGEND_ITEMS;
  }

  if (controls.colorMode === "population") {
    return POPULATION_COLOR_RULES;
  }

  return ELDERLY_COLOR_RULES;
}

function meshColor(properties, controls) {
  if (controls.showCandidates) {
    return getScoreColor(getScore(properties));
  }

  if (controls.colorMode === "population") {
    const rawPopulation =
      properties?.population ??
      properties?.["　人口（総数）"];

    if (rawPopulation === null || rawPopulation === undefined || rawPopulation === "") {
      return "#f3f4f6";
    }

    const population = Number(rawPopulation);

    if (Number.isNaN(population)) {
      return "#f3f4f6";
    }

    if (population >= 600) return "#7c2d12";
    if (population >= 100) return "#c2410c";
    if (population >= 50) return "#f97316";
    if (population >= 0) return "#fdba74";

    return "#f3f4f6";
  }
  

  const rawElderlyRate =
    properties?.elderly_rate ??
    properties?.["高齢者割合人口（総数）（％）"];

  if (rawElderlyRate === null || rawElderlyRate === undefined || rawElderlyRate === "") {
    return "#f3f4f6";
  }

  const elderlyRate = Number(rawElderlyRate);

  if (Number.isNaN(elderlyRate)) {
    return "#f3f4f6";
  }

  if (elderlyRate >= 85) return "#581845"; // very dark purple
  if (elderlyRate >= 65) return "#900c3f"; // dark magenta/red
  if (elderlyRate >= 45) return "#c70039"; // strong red
  if (elderlyRate >= 35) return "#ff5733"; // orange-red
  if (elderlyRate >= 25) return "#ffc300"; // yellow
  if (elderlyRate > 0) return "#fff3b0";   // pale yellow
  return "#f3f4f6";                         // no data
}

function meshPopup(feature, controls, t) {
  const p = feature.properties || {};
  const candidate = isCandidate(p, controls);

  return `
    <div class="map-popup">
      <h3>500m Mesh</h3>
      <dl>
        <dt>${t("meshId")}</dt><dd>${p.mesh_id ?? "N/A"}</dd>
        <dt>${t("population")}</dt><dd>${formatNumber(p.population)}</dd>
        <dt>${t("elderlyRate")}</dt><dd>${formatNumber(p.elderly_rate, "%")}</dd>
        <dt>${t("nearestMedical")}</dt><dd>${formatNumber(getMedicalDistance(p, controls.hospitalField), " m")}</dd>
        <dt>${t("nearest1ji")}</dt><dd>${formatNumber(p.nearest_1ji_hospital_m, " m")}</dd>
        <dt>${t("nearest2ji")}</dt><dd>${formatNumber(p.nearest_2ji_hospital_m, " m")}</dd>
        <dt>${t("nearest3ji")}</dt><dd>${formatNumber(p.nearest_3ji_hospital_m, " m")}</dd>
        <dt>${t("nearestBusStop")}</dt><dd>${formatNumber(p.nearest_bus_stop_m, " m")}</dd>
        <dt>${t("nearestTrainStation")}</dt><dd>${formatNumber(p.nearest_train_stop_m, " m")}</dd>
        <dt>${t("accessPriority")}</dt><dd>${formatNumber(getScore(p))}</dd>
        <dt>${t("status")}</dt><dd>${candidate ? t("medicalAccessDifficultyCandidate") : t("normal")}</dd>
      </dl>
    </div>
  `;
}

function pointPopup(feature, fallbackTitle) {
  const p = feature.properties || {};

  const title =
    p.name ||
    p.stop_name ||
    p["施設名称"] ||
    p["医療機関分類"] ||
    fallbackTitle;
  
    const exclude_field=[
      "1次","2次","2.5次","3次","type", "type_ji"
    ];

  const rows = Object.entries(p)
    .filter(([key, value]) => value !== null && value !== undefined && value !== "" && !exclude_field.includes(key))
    .map(([key, value]) => `<dt>${key}</dt><dd>${value}</dd>`)
    .join("");

  return `
    <div class="map-popup">
      <h3>${title}</h3>
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

function createTriangle(latlng, sizeMeters = 300) {
  const lat = latlng.lat;
  const lng = latlng.lng;

  // Convert meters to degrees (approximation)
  const dLat = sizeMeters / 111320;
  const dLng = sizeMeters / (111320 * Math.cos(lat * Math.PI / 180));

  return [
    [lat + dLat, lng],         // top
    [lat - dLat, lng - dLng],  // bottom left
    [lat - dLat, lng + dLng],  // bottom right
  ];
}

const STOP_STYLE_RULES = [
  {
    key: "tram_light_rail",
    labelKey: "tramLightRail",
    color: "#7c3aed",
    fillColor: "#a78bfa",
  },
  {
    key: "rail_train",
    labelKey: "railTrain",
    color: "#0f766e",
    fillColor: "#2dd4bf",
  },
  {
    key: "bus",
    labelKey: "bus",
    color: "#1d4ed8",
    fillColor: "#60a5fa",
  },
];

function stopColor(feature) {
  const modes = stopModes(feature);

  if (modes.includes("tram_light_rail")) {
    return STOP_STYLE_RULES[0];
  }
  if (modes.includes("rail") || modes.includes("train")) {
    return STOP_STYLE_RULES[1];
  }
  return STOP_STYLE_RULES[2];
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

function selectedHospitalTypeFromField(hospitalField) {
  const fieldToType = {
    "1_nearest_1次_mesh_to_hospital_straight_distance_m": "1",
    "1_nearest_2次_mesh_to_hospital_straight_distance_m": "2",
    "1_nearest_2.5次_mesh_to_hospital_straight_distance_m": "2.5",
    "1_nearest_3次_mesh_to_hospital_straight_distance_m": "3",
  };

  return fieldToType[hospitalField] || null;
}

function hospitalMatchesSelectedField(feature, hospitalField) {
  const selectedType = selectedHospitalTypeFromField(hospitalField);

  // nearest_medical_m means all hospitals
  if (!selectedType) return true;

  const hospitalType = String(feature.properties?.type_ji ?? "0").trim();

  return hospitalType === selectedType;
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

function meshOverlapsActiveBuffer(properties, controls) {
  if (!controls.showMedicalBuffers && !controls.showTransportBuffers) {
    return false;
  }

  if (controls.showMedicalBuffers) {
    const medicalDistance = getMedicalDistance(properties, controls.hospitalField);

    if (medicalDistance !== null && medicalDistance <= controls.medicalRadiusM) {
      return true;
    }
  }

  if (controls.showTransportBuffers) {
    const busDistance = getMeters(properties, "nearest_bus_stop_m");
    const trainDistance = getMeters(properties, "nearest_train_stop_m");

    if (controls.mergePublicTransport) {
      const nearestTransport = Math.min(busDistance ?? Infinity, trainDistance ?? Infinity);

      if (nearestTransport <= controls.publicTransportRadiusM) {
        return true;
      }
    } else {
      if (busDistance !== null && busDistance <= controls.busRadiusM) {
        return true;
      }

      if (trainDistance !== null && trainDistance <= controls.trainRadiusM) {
        return true;
      }
    }
  }

  return false;
}

function getHospitalType(properties) {
  return String(properties?.type_ji ?? "0").trim();
}

function getHospitalPane(properties) {
  const type = getHospitalType(properties);

  if (type === "1") {
    return "hospitalPrimaryPane";
  }

  if (type === "2" || type === "2.5" || type === "3") {
    return "hospitalHighPane";
  }

  return "hospitalGeneralPane";
}

function getHospitalMarkerRadius(properties) {
  const type = getHospitalType(properties);

  const baseRadius = HOSPITAL_MARKER_RADIUS_M / 2;

  if (type === "3") {
    return baseRadius * 1.7;
  }

  if (type === "2.5") {
    return baseRadius * 1.5;
  }

  if (type === "2") {
    return baseRadius * 1.35;
  }

  if (type === "1") {
    return baseRadius;
  }

  return baseRadius * 0.85;
}

function getMeshFillOpacity(properties, controls) {
  const normalOpacity = 0.7;//controls.meshOpacity / 100;

  const hasActiveBuffers = controls.showMedicalBuffers || controls.showTransportBuffers;

  if (!hasActiveBuffers) {
    return normalOpacity;
  }

  const overlapsBuffer = meshOverlapsActiveBuffer(properties, controls);

  // Inside buffer = more transparent so buffer underneath is visible.
  // Outside buffer = more opaque so difference is easy to notice.
  if (overlapsBuffer) {
    return Math.min(normalOpacity, 0.25);
  }

  return Math.max(normalOpacity, 0.72);
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
  const filteredHospitals = useMemo(() => {
    if (!data.hospitals) return null;

    return {
      ...data.hospitals,
      features: data.hospitals.features.filter((feature) =>
        hospitalMatchesVisibilityMode(
          feature,
          appliedControls.hospitalVisibilityMode
        )
      ),
    };
  }, [data.hospitals, appliedControls.hospitalVisibilityMode]);

  const updateControl = useCallback((key, value) => {
    setProcessing(true);
    setControls((current) => ({ ...current, [key]: value }));
  }, []);

  useEffect(() => {
    const map = L.map("map", { zoomControl: false, preferCanvas: false }).setView(TOYAMA_VIEW.center, TOYAMA_VIEW.zoom);
    mapRef.current = map;

    [
      ["hospitalHighPane", 580],     // 2ji, 2.5ji, 3ji
      ["hospitalPrimaryPane", 570],  // 1ji
      ["hospitalGeneralPane", 560],  // type_ji 0 / unknown
      ["stopPane", 555],
      ["bufferStrokePane", 550],
      ["meshPane", 520],
      ["bufferFillPane", 500],
      ["stationPane", 450],
    ].forEach(([name, zIndex]) => {
      map.createPane(name);
      map.getPane(name).style.zIndex = zIndex;
    });
    map.getPane("bufferFillPane").style.opacity = 0.6;//initialControls.bufferOpacity / 100;
    map.getPane("hospitalPrimaryPane").style.opacity = 0.7;//initialControls.bufferOpacity / 100;
    
    map.getPane("bufferFillPane").style.pointerEvents = "none";
    map.getPane("bufferStrokePane").style.pointerEvents = "none";


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
          // console.log(mesh.features[0].geometry.type);
          // console.log(mesh.features[0].geometry);
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

  const meshLegendItems = useMemo(() => {
    return getMeshLegendItems(appliedControls);
  }, [appliedControls]);

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
      
      if (map.getPane("bufferFillPane")) {
          map.getPane("bufferFillPane").style.opacity = 0.6;//appliedControls.bufferOpacity / 100;
      }

      layersRef.current = {};
      bufferRef.current = {};

      // if (appliedControls.showMesh) {
      //   const scoreFilteredMesh = {
      //     ...data.mesh,
      //     features: data.mesh.features.filter(
      //       (feature) => getScore(feature.properties) === appliedControls.scoreThreshold
      //     ),
      //   };

      //   layersRef.current.mesh = L.geoJSON(scoreFilteredMesh, {
      //   // if (appliedControls.showMesh) {
      //   //   layersRef.current.mesh = L.geoJSON(data.mesh, {
      //     pointToLayer: (feature, latlng) => {
      //       const candidate = isCandidate(feature.properties, appliedControls);
      //       return L.circle(latlng, {
      //         pane: "meshPane",
      //         radius: MESH_EQUAL_AREA_RADIUS_M,
      //         color: candidate ? "#991b1b" : "#374151",
      //         fillColor: meshColor(feature.properties, appliedControls),
      //         fillOpacity: (appliedControls.meshOpacity / 100) * (candidate ? 1 : 0.86),
      //         opacity: Math.min(1, appliedControls.meshOpacity / 100 + 0.24),
      //         weight: candidate ? 2 : 1,
      //       });
      //     },
      //     style: (feature) => ({
      //       color: isCandidate(feature.properties, appliedControls) ? "#991b1b" : "#374151",
      //       fillColor: meshColor(feature.properties, appliedControls),
      //       fillOpacity: appliedControls.meshOpacity / 100,
      //       opacity: Math.min(1, appliedControls.meshOpacity / 100 + 0.24),
      //       weight: isCandidate(feature.properties, appliedControls) ? 2 : 1,
      //       pane: "meshPane",
      //     }),
      //     onEachFeature: (feature, layer) => layer.bindPopup(() => meshPopup(feature, appliedControls)),
      //   }).addTo(map);
      // }
      if (appliedControls.showMesh) {
        const scoreFilteredMesh = {
          ...data.mesh,
          features: data.mesh.features.filter(
            // (feature) => getScore(feature.properties) === appliedControls.scoreThreshold
            (feature) => matchScore(getScore(feature.properties), appliedControls.scoreThreshold) 
          ),
        };

        layersRef.current.mesh = L.geoJSON(scoreFilteredMesh, {
          style: (feature) => {
            const candidate = isCandidate(feature.properties, appliedControls);

            return {
              pane: "meshPane",
              stroke: false,
              fillColor: meshColor(feature.properties, appliedControls),
              fillOpacity: getMeshFillOpacity(feature.properties, appliedControls),
              opacity: 1,
            };
          },
          onEachFeature: (feature, layer) =>
            layer.bindPopup(() => meshPopup(feature, appliedControls, t)),
        }).addTo(map);
      }

      
      

      
      if (filteredHospitals && filteredHospitals.features.length > 0) {
        layersRef.current.hospitals = L.geoJSON(filteredHospitals, {

          pointToLayer: (feature, latlng) => {
            const hospitalStyle = getHospitalTypeStyle(feature.properties);

            return L.circle(latlng, {

              pane: getHospitalPane(feature.properties),
              radius: getHospitalMarkerRadius(feature.properties),

              color: hospitalStyle.color,
              fillColor: hospitalStyle.fillColor,
              fillOpacity: appliedControls.pointOpacity / 100,
              opacity: Math.min(1, appliedControls.pointOpacity / 100 + 0.12),
              weight: getHospitalType(feature.properties) === "1" ? 2 : 3,
            });
          },
          onEachFeature: (feature, layer) =>
            layer.bindPopup(() => pointPopup(feature, "Medical facility")),
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
            return L.polygon(createTriangle(latlng, STOPS_MARKER_RADIUS_M), {
              pane: "stopPane",
              // radius: STOPS_MARKER_RADIUS_M,
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
        
        const filteredHospitalsForBuffer = {
            ...data.hospitals,
            features: data.hospitals.features.filter((feature) =>
              hospitalMatchesSelectedField(feature, appliedControls.hospitalField)
            ),
          };


        L.geoJSON(filteredHospitalsForBuffer, {
          pointToLayer: (_feature, latlng) => {
            // Fill layer: opacity handled by the whole pane
            L.circle(latlng, {
              pane: "bufferFillPane",
              radius: appliedControls.medicalRadiusM,
              stroke: false,
              fillColor: "#1142e2",
              fillOpacity: 1,
              interactive: false,
            }).addTo(group);

            // Border layer: always full opacity
            return L.circle(latlng, {
              pane: "bufferStrokePane",
              radius: appliedControls.medicalRadiusM,
              color: "#dc2626",
              opacity: 0,
              fill: false,
              weight: 1.5,
              interactive: false,
            }).addTo(group);
          },
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
            pointToLayer: (_feature, latlng) =>{
            // Fill
            L.circle(latlng, {
              pane: "bufferFillPane",
              radius: trainRadius,
              stroke: false,
              fillColor: "#0be7b8",
              fillOpacity: 1,
              interactive: false,
            }).addTo(group);

            // Border
            return L.circle(latlng, {
              pane: "bufferStrokePane",
              radius: trainRadius,
              color: "#0f766e",
              opacity: 0,
              fill: false,
              weight: 1.5,
              interactive: false,
            }).addTo(group);
          }});
        }

        if (filteredBusStops) {
          L.geoJSON(filteredBusStops, {
            pointToLayer: (_feature, latlng) => {
              L.circle(latlng, {
                pane: "bufferFillPane",
                radius: busRadius,
                stroke: false,
                fillColor: "#0c76f8",
                fillOpacity: 1,
                interactive: false,
              }).addTo(group);

              return L.circle(latlng, {
                pane: "bufferStrokePane",
                radius: busRadius,
                color: "#2563eb",
                opacity: 0,
                fill: false,
                weight: 1.5,
                interactive: false,
              }).addTo(group);
            },
          });
        }

        group.addTo(map);
        bufferRef.current.transport = group;
      }

      window.setTimeout(() => setProcessing(false), 80);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [data, appliedControls, filteredBusStops, filteredHospitals, t]);

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <header>
          <p>{t("appEyebrow")}</p>
          <h1>{t("appTitle")}</h1>
        </header>


        <ControlGroup icon={Activity} title={t("analysis")}>
          <Checkbox label={t("highlightCandidates")} checked={controls.showCandidates} onChange={(value) => updateControl("showCandidates", value)} />
          {/* <Range label={t("scoreThreshold")} value={controls.scoreThreshold} min={0} max={4} suffix="" onChange={(value) => updateControl("scoreThreshold", value)} /> */}
            <label className="select-row">
              {t("scoreThreshold")}
              <select
                value={controls.scoreThreshold}
                onChange={(event) => updateControl("scoreThreshold", Number(event.target.value))}
              >
                <option value={-1}>{t("noFilter")}</option>
                <option value={0}>{t("scoreGoodAccess")}</option>
                <option value={2}>{t("scoreWatchArea")}</option>
                <option value={3}>{t("scoreHighPriority")}</option>
                <option value={4}>{t("scoreVeryHighPriority")}</option>
              </select>
            </label>
          <div className="stat-card">
            <span>{t("candidateMeshes")}</span>
            <strong>{candidateCount}</strong>
          </div>
        </ControlGroup>

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
          <label className="select-row">
            {t("hospitalDisplay")}
            <select
              value={controls.hospitalVisibilityMode}
              onChange={(event) =>
                updateControl("hospitalVisibilityMode", event.target.value)
              }
            >
              <option value="all">{t("showAllHospitals")}</option>
              <option value="none">{t("showNoHospitals")}</option>
              <option value="0">{t("showGeneralHospitals")}</option>
              <option value="1">{t("show1jiHospitals")}</option>
              <option value="2">{t("show2jiHospitals")}</option>
              <option value="2.5">{t("show25jiHospitals")}</option>
              <option value="3">{t("show3jiHospitals")}</option>
            </select>
          </label>
          <Checkbox label={t("showMedicalBuffer")} checked={controls.showMedicalBuffers} onChange={(value) => updateControl("showMedicalBuffers", value)} />
          <label className="select-row">
            {t("medicalDistanceField")}
            <select value={controls.hospitalField} onChange={(event) => updateControl("hospitalField", event.target.value)}>
              <option value="nearest_medical_m">{t("nearestMedical")}</option>
              <option value="1_nearest_1次_mesh_to_hospital_straight_distance_m">{t("nearest1ji")}</option>
              <option value="1_nearest_2次_mesh_to_hospital_straight_distance_m">{t("nearest2ji")}</option>
              <option value="1_nearest_2.5次_mesh_to_hospital_straight_distance_m">{t("nearest25ji")}</option>
              <option value="1_nearest_3次_mesh_to_hospital_straight_distance_m">{t("nearest3ji")}</option>
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
        {/* if (controls.) */}
        {/* <div className="legend">
          {meshLegendItems.map((item) => item.label && (
            <span key={item.label}>
              <i style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}

        </div> */}

        <div className="legend">
          {appliedControls.showMesh&&(<div className="legend-section">
            <strong className="legend-title">
              {appliedControls.showCandidates ? t("accessPriority") : controls.colorMode === "population" ? t("population"): t("elderlyRate")}
            </strong>

            {meshLegendItems.map((item) => (
              <span key={item.key || item.labelKey} className="legend-item">
                <i
                  className="legend-square"
                  style={{ backgroundColor: item.color }}
                />
                {t(item.labelKey)}
              </span>
            ))}
          </div>)}

          {appliedControls.hospitalVisibilityMode !== "none" && (
            <div className="legend-section">
              <strong className="legend-title">{t("hospitals")}</strong>              
                {Object.entries(HOSPITAL_TYPE_STYLES)
                  .filter(([type]) =>
                    appliedControls.hospitalVisibilityMode === "all" ||
                    appliedControls.hospitalVisibilityMode === type
                  )
                  .map(([type, item]) => (
                    <span key={`hospital-${type}`} className="legend-item">
                      <i
                        className="legend-circle"
                        style={{
                          backgroundColor: item.fillColor,
                          borderColor: item.color,
                        }}
                      />
                      {t(item.labelKey)}
                    </span>
                  ))}
            </div>
          )}

          {(appliedControls.showStations || appliedControls.showBusStops) && (
  <div className="legend-section">
    <strong className="legend-title">{t("transport")}</strong>

    
      {STOP_STYLE_RULES
        .filter((item) => appliedControls.stopModeVisibility[item.key] !== false)
        .map((item) => (
          <span key={item.key} className="legend-item">
            <i
              className="legend-triangle"
              style={{
                borderBottomColor: item.fillColor,
              }}
            />
            {t(item.labelKey)}
          </span>
        ))}

      </div>
    )}
        </div>
        
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
