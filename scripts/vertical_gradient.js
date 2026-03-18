#!/usr/bin/env node
/**
 * Vertical price gradient by estate/building: slope of price_per_sqft vs floor.
 * Requires Node 18+ (fetch) or run with: node --experimental-json-modules or load JSON manually.
 */
const fs = require('fs');
const path = require('path');

const geojson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/midland_2018_cleaned.geojson'), 'utf8')
);

// Group by building (estate + building) to get floor vs price_per_sqft per building
const byBuilding = new Map();
for (const f of geojson.features || []) {
  if (f.geometry?.type !== 'Point' || f.properties?.price_per_sqft == null) continue;
  const estate = f.properties.estate || '';
  const building = f.properties.building || '';
  const key = estate + '\t' + building;
  if (!byBuilding.has(key)) byBuilding.set(key, { estate, building, points: [] });
  const floor = Number(f.properties.floor);
  if (isNaN(floor)) continue;
  byBuilding.get(key).points.push({ floor, price: Number(f.properties.price_per_sqft) });
}

// Per building: linear regression slope (price_per_sqft vs floor) and range
function slopeAndRange(points) {
  const n = points.length;
  if (n < 3) return null;
  const sumX = points.reduce((s, p) => s + p.floor, 0);
  const sumY = points.reduce((s, p) => s + p.price, 0);
  const sumXX = points.reduce((s, p) => s + p.floor * p.floor, 0);
  const sumXY = points.reduce((s, p) => s + p.floor * p.price, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;
  const slope = (sumXY - n * meanX * meanY) / (sumXX - n * meanX * meanX);
  const minP = Math.min(...points.map(p => p.price));
  const maxP = Math.max(...points.map(p => p.price));
  const range = maxP - minP;
  return { slope, range, n, minP, maxP };
}

const buildingStats = [];
for (const [key, { estate, building, points }] of byBuilding) {
  const res = slopeAndRange(points);
  if (!res) continue;
  buildingStats.push({
    estate,
    building,
    ...res
  });
}

// Aggregate by estate: average absolute slope and max range (most "noticeable" gradient)
const byEstate = new Map();
for (const b of buildingStats) {
  if (!byEstate.has(b.estate)) {
    byEstate.set(b.estate, { estate: b.estate, slopes: [], ranges: [], buildings: [] });
  }
  const e = byEstate.get(b.estate);
  e.slopes.push(b.slope);
  e.ranges.push(b.range);
  e.buildings.push({ building: b.building, slope: b.slope, range: b.range, n: b.n });
}

const estateSummary = [];
for (const [estate, e] of byEstate) {
  const meanAbsSlope = e.slopes.reduce((s, x) => s + Math.abs(x), 0) / e.slopes.length;
  const maxRange = Math.max(...e.ranges);
  const meanRange = e.ranges.reduce((a, b) => a + b, 0) / e.ranges.length;
  estateSummary.push({
    estate,
    meanAbsSlope: Math.round(meanAbsSlope),
    maxRange: Math.round(maxRange),
    meanRange: Math.round(meanRange),
    numBuildings: e.buildings.length
  });
}

// Sort by most noticeable: first by max range (spread), then by mean absolute slope
estateSummary.sort((a, b) => b.maxRange - a.maxRange || b.meanAbsSlope - a.meanAbsSlope);

console.log('Estates with most noticeable vertical price gradient (price_per_sqft vs floor)\n');
console.log('Rank | Estate                    | Max range (HK$/ft²) | Mean | slope | | # buildings');
console.log('-----|---------------------------|---------------------|------|-------|');
estateSummary.slice(0, 25).forEach((r, i) => {
  console.log(
    `${(i + 1).toString().padStart(4)} | ${r.estate.padEnd(25)} | ${String(r.maxRange).padStart(19)} | ${String(r.meanAbsSlope).padStart(4)} | ${String(r.numBuildings).padStart(6)}`
  );
});

console.log('\n--- Top 10 by mean absolute slope (HK$/sqft per floor) ---');
estateSummary.sort((a, b) => b.meanAbsSlope - a.meanAbsSlope);
estateSummary.slice(0, 10).forEach((r, i) => {
  console.log(`${i + 1}. ${r.estate}: mean |slope| ≈ ${r.meanAbsSlope} HK$/ft² per floor, max range ${r.maxRange}`);
});
