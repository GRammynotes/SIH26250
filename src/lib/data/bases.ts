export interface AirBase {
  id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
  elevation: number;
  primaryAircraft: string[];
}

export const IAF_BASES: AirBase[] = [
  { id: 'ambala',   name: 'Ambala AFS',   code: 'AMB', lat: 30.3777, lng: 76.8164, elevation: 275,  primaryAircraft: ['Su-30MKI'] },
  { id: 'jodhpur',  name: 'Jodhpur AFS',  code: 'JOD', lat: 26.2511, lng: 73.0489, elevation: 220,  primaryAircraft: ['MiG-29UPG'] },
  { id: 'leh',      name: 'Leh AFS',      code: 'LEH', lat: 34.1358, lng: 77.5464, elevation: 3256, primaryAircraft: ['Rafale'] },
  { id: 'srinagar', name: 'Srinagar AFS', code: 'SXR', lat: 34.0837, lng: 74.7973, elevation: 1655, primaryAircraft: [] }, // UNVERIFIED standing aircraft assignment; no type claimed.
  { id: 'tezpur',   name: 'Tezpur AFS',   code: 'TEZ', lat: 26.7092, lng: 92.7847, elevation: 70,   primaryAircraft: ['Su-30MKI'] },
  { id: 'pune',     name: 'Pune AFS',     code: 'PNQ', lat: 18.5822, lng: 73.9197, elevation: 592,  primaryAircraft: [] }, // UNVERIFIED permanent fighter assignment; logistics/training role only.
  { id: 'gwalior',  name: 'Maharajpur AFS', code: 'GWL', lat: 26.2933, lng: 78.2278, elevation: 188,  primaryAircraft: ['Mirage-2000'] },
  { id: 'jamnagar', name: 'Jamnagar AFS', code: 'JGA', lat: 22.4675, lng: 70.0117, elevation: 21,   primaryAircraft: ['Jaguar'] },
  { id: 'sulur',    name: 'Sulur AFS',    code: 'SLR', lat: 11.0168, lng: 77.1577, elevation: 381,  primaryAircraft: ['Tejas'] },
  { id: 'bathinda', name: 'Bathinda AFS', code: 'BTI', lat: 30.2700, lng: 74.7556, elevation: 203,  primaryAircraft: [] }, // UNVERIFIED permanent MiG-29UPG assignment.
  { id: 'hasimara', name: 'Hasimara AFS', code: 'HAS', lat: 26.6983, lng: 89.3691, elevation: 90,   primaryAircraft: ['Rafale'] },
  { id: 'hindan',   name: 'Hindan AFS',   code: 'HDN', lat: 28.6809, lng: 77.4531, elevation: 216, primaryAircraft: ['MiG-29UPG'] },
  { id: 'adampur',  name: 'Adampur AFS',  code: 'ADP', lat: 31.8425, lng: 75.7689, elevation: 243, primaryAircraft: [] }, // UNVERIFIED permanent aircraft mix.
  { id: 'sirsa',    name: 'Sirsa AFS',    code: 'SSA', lat: 29.5500, lng: 75.2500, elevation: 212, primaryAircraft: [] }, // UNVERIFIED permanent MiG-29UPG assignment.
];
