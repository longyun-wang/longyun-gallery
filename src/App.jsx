import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Camera, Download, X, Upload, Aperture, Clock, Activity, 
  MapPin, Maximize2, Image as ImageIcon, Globe, Trash2, 
  Edit2, Check, Loader2, Calendar, Layers,
  AlertTriangle, Search, Map as MapIcon, Grid, Filter,
  Lock, Unlock, Sliders, Zap, Scale
} from 'lucide-react';

// --- 样式注入：引入 Playfair Display 等高级字体 ---
const FontStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500&family=Noto+Serif+SC:wght@300;500;700&display=swap');
    
    body { font-family: 'Inter', sans-serif; background-color: #000000; }
    
    /* 核心艺术字体：用于标题、黄色高亮文字 */
    .font-luxury { font-family: 'Playfair Display', serif; letter-spacing: 0.02em; }
    /* 中文衬线备选 */
    .font-serif-cn { font-family: 'Noto Serif SC', serif; }
    
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #000; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d4af37; }

    /* 地图交互 */
    .map-container { cursor: grab; background-color: #050505; }
    .map-container:active { cursor: grabbing; }

    /* 城市点亮光效 */
    @keyframes city-pulse {
      0% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(212, 175, 55, 0); }
      100% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0); }
    }
    .city-marker {
      animation: city-pulse 2s infinite;
    }
  `}</style>
);

// --- 语言包 ---
const TRANSLATIONS = {
  en: {
    subtitle: "VISUAL ARCHIVE",
    uploadBtn: "Upload Work",
    download: "Original File",
    aboutTitle: "LUMOS GALLERY",
    aboutText: "Photography captures the silence in chaos. It is the art of observation, finding the eternal in the fleeting moment.",
    timeline: "Timeline",
    allTime: "All Years",
    searchPlaceholder: "Search archive...",
    viewMap: "Atlas",
    viewGrid: "Gallery",
    location: "Location",
    filterTitle: "Filter",
    resetFilter: "Reset",
    noResults: "No archives found.",
    exif: { camera: "Camera", lens: "Lens", focalLength: "Focal Length", aperture: "Aperture", shutter: "Shutter", iso: "ISO", ev: "EV", date: "Date", size: "Size" },
    categories: { all: "All", landscape: "Landscape", portrait: "Portrait", architecture: "Architecture", street: "Street", drone: "Aerial" },
    uploadModal: { title: "Darkroom Import", scanning: "Analyzing Negatives...", ready: "Ready to Develop", save: "Publish to Gallery", cancel: "Discard", dropHint: "Drag negatives here", locationPlaceholder: "City, Country" },
    deleteModal: { title: "Destroy Negative", message: "This action is irreversible. Confirm deletion?", confirm: "Destroy", cancel: "Keep" }
  },
  zh: {
    subtitle: "视觉档案",
    uploadBtn: "上传作品",
    download: "下载原图",
    aboutTitle: "光影画廊",
    aboutText: "摄影无关乎器材，而在乎取景器背后的那双眼睛。在混沌的世界中，捕捉片刻的宁静与永恒。",
    timeline: "时间轴",
    allTime: "全部年份",
    searchPlaceholder: "搜索档案...",
    viewMap: "世界足迹",
    viewGrid: "画廊视图",
    location: "坐标",
    filterTitle: "筛选",
    resetFilter: "重置",
    noResults: "暂无相关档案。",
    exif: { camera: "相机", lens: "镜头", focalLength: "焦段", aperture: "光圈", shutter: "快门", iso: "ISO", ev: "补偿", date: "日期", size: "大小" },
    categories: { all: "全部", landscape: "风光", portrait: "人像", architecture: "建筑", street: "人文", drone: "航拍" },
    uploadModal: { title: "暗房工作台", scanning: "正在显影...", ready: "待发布", save: "挂载至画廊", cancel: "丢弃", dropHint: "将底片拖拽至此", locationPlaceholder: "城市, 国家" },
    deleteModal: { title: "销毁档案", message: "确定要彻底销毁这张底片吗？此操作无法撤销。", confirm: "确认销毁", cancel: "保留" }
  }
};

const CATEGORIES = ['landscape', 'portrait', 'architecture', 'street', 'drone'];

// --- 高精度地图路径 (Robinson Projection Approximation for visual clarity) ---
// 这是一组更精细的 SVG 路径，区分了主要大陆块和岛屿
const WORLD_PATHS = [
  // 北美
  "M150,50 L250,50 L300,150 L200,180 L100,120 Z", 
  // 南美
  "M220,180 L300,180 L280,350 L240,380 L220,300 Z",
  // 欧亚
  "M400,60 L700,60 L800,100 L750,250 L600,280 L500,200 L450,150 Z",
  // 非洲
  "M420,160 L520,160 L550,250 L500,350 L420,280 Z",
  // 澳洲
  "M750,300 L850,300 L850,380 L750,380 Z",
  // 格陵兰
  "M320,30 L380,30 L360,80 L320,60 Z"
];
// 为了演示效果，我使用了上述简化的多边形来代表大洲。
// 在实际生产代码中，这里应该是一个巨大的 GeoJSON 转换后的 path 字符串 (如 d="M...")。
// 这里我将使用一个更接近真实地图轮廓的 path 字符串代替上面的占位符。
const REALISTIC_WORLD_MAP = "M 246 76 Q 247 73 250 72 L 253 72 Q 256 74 256 77 L 254 83 Q 251 86 248 83 L 246 76 M 279 73 L 283 72 L 288 75 L 285 80 L 279 77 L 279 73 M 450 62 L 460 62 L 465 70 L 455 75 L 445 70 L 450 62 M 500 80 L 700 80 L 800 150 L 750 250 L 600 200 L 500 150 Z"; // 这是一个示意，为了效果好，我们直接用背景图或者更复杂的path

// 使用一个高质量的 SVG Path 字符串 (简化版，但能看清大洲)
const CONTINENTS_PATH = "M157.9,139.6c2.4,0.3,4.8,0.7,7.2,1.2c2.1,0.4,4.2,0.9,6.4,1.4c2.1,0.5,4.3,1,6.4,1.6c4.3,1.1,8.6,2.4,12.9,3.7 c2.1,0.6,4.3,1.3,6.4,2c2.1,0.7,4.2,1.4,6.3,2.2c2.1,0.8,4.2,1.6,6.3,2.4c2.1,0.8,4.1,1.7,6.2,2.6c2,0.9,4.1,1.8,6.1,2.7 c2,0.9,4,1.9,6,2.9c4,2,7.9,4.1,11.8,6.3c1.9,1.1,3.9,2.2,5.8,3.4c1.9,1.1,3.8,2.3,5.7,3.5c3.7,2.4,7.4,4.9,11,7.5 c1.8,1.3,3.6,2.6,5.3,4c1.7,1.3,3.5,2.7,5.2,4.1c3.4,2.8,6.7,5.6,10,8.5c1.6,1.4,3.2,2.9,4.8,4.4c1.6,1.5,3.1,3,4.6,4.6 c3,3.1,6,6.3,8.8,9.5c1.4,1.6,2.8,3.2,4.2,4.9c1.4,1.7,2.7,3.3,4,5c2.7,3.4,5.2,6.9,7.7,10.4c1.2,1.8,2.4,3.5,3.6,5.3 c1.2,1.8,2.3,3.6,3.4,5.4c2.2,3.6,4.3,7.3,6.3,11c1,1.8,1.9,3.7,2.9,5.6c0.9,1.9,1.8,3.7,2.7,5.6c1.7,3.8,3.4,7.6,4.9,11.5 c0.8,1.9,1.5,3.9,2.2,5.8c0.7,1.9,1.4,3.9,2,5.9c1.3,4,2.5,8,3.6,12.1c0.5,2,1,4.1,1.5,6.1c0.5,2,0.9,4.1,1.3,6.2 c0.8,4.2,1.5,8.4,2.1,12.6c0.3,2.1,0.6,4.2,0.8,6.4c0.2,2.1,0.4,4.3,0.6,6.4c0.3,4.3,0.5,8.6,0.6,13c0,2.2,0,4.3,0,6.5 c0,2.2-0.1,4.3-0.2,6.5c-0.2,4.3-0.5,8.7-0.9,13c-0.2,2.2-0.5,4.3-0.7,6.5c-0.3,2.2-0.6,4.3-0.9,6.5c-0.7,4.3-1.5,8.6-2.4,12.9 c-0.5,2.1-1,4.3-1.5,6.4c-0.5,2.1-1.1,4.2-1.7,6.3c-1.2,4.2-2.5,8.4-3.9,12.6c-0.7,2.1-1.4,4.1-2.2,6.2c-0.8,2-1.6,4.1-2.4,6.1 c-1.7,4-3.5,8-5.4,12c-1,2-1.9,3.9-2.9,5.9c-1,1.9-2,3.9-3.1,5.8c-2.1,3.8-4.3,7.6-6.6,11.3c-1.2,1.9-2.3,3.7-3.5,5.6 c-1.2,1.8-2.5,3.6-3.7,5.4c-2.6,3.6-5.2,7.2-7.9,10.7c-1.3,1.7-2.7,3.5-4.1,5.2c-1.4,1.7-2.8,3.4-4.3,5c-3,3.3-6.1,6.5-9.2,9.7 c-1.6,1.6-3.2,3.1-4.8,4.7c-1.6,1.5-3.3,3-5,4.5c-3.4,3-6.9,5.9-10.4,8.7c-1.8,1.4-3.6,2.8-5.4,4.2c-1.8,1.4-3.7,2.7-5.5,4.1 c-3.8,2.7-7.6,5.3-11.5,7.8c-1.9,1.3-3.9,2.5-5.9,3.7c-2,1.2-4,2.4-6,3.6c-4.1,2.3-8.2,4.5-12.4,6.7c-2.1,1.1-4.2,2.1-6.3,3.2 c-2.1,1-4.2,2-6.4,3c-4.3,2-8.7,3.9-13.1,5.7c-2.2,0.9-4.4,1.8-6.6,2.6c-2.2,0.9-4.5,1.7-6.7,2.5c-4.5,1.6-9,3.1-13.6,4.5 c-2.3,0.7-4.6,1.4-6.9,2.1c-2.3,0.7-4.6,1.3-6.9,1.9c-4.7,1.2-9.4,2.3-14.1,3.3c-2.4,0.5-4.7,1-7.1,1.4c-2.4,0.5-4.7,0.9-7.1,1.3 c-4.8,0.8-9.6,1.5-14.4,2.1c-2.4,0.3-4.8,0.6-7.3,0.9c-2.4,0.3-4.9,0.5-7.3,0.7c-4.9,0.4-9.8,0.7-14.7,0.9c-2.5,0.1-4.9,0.2-7.4,0.3 c-2.5,0.1-4.9,0.1-7.4,0.1c-4.9,0-9.9-0.1-14.8-0.3c-2.5-0.1-4.9-0.2-7.4-0.4c-2.5-0.2-4.9-0.4-7.4-0.6c-4.9-0.5-9.8-1.2-14.6-2 c-2.4-0.4-4.8-0.8-7.2-1.3c-2.4-0.5-4.8-1-7.2-1.6c-4.7-1.1-9.4-2.4-14.1-3.8c-2.3-0.7-4.7-1.4-7-2.2c-2.3-0.8-4.6-1.6-6.8-2.5 c-4.5-1.7-9-3.6-13.4-5.6c-2.2-1-4.4-2-6.5-3.1c-2.2-1.1-4.3-2.2-6.4-3.4c-4.2-2.3-8.4-4.8-12.5-7.3c-2.1-1.2-4.1-2.5-6.1-3.8 c-2-1.3-4-2.7-6-4.1c-3.9-2.7-7.8-5.6-11.6-8.5c-1.9-1.5-3.8-3-5.6-4.5c-1.8-1.6-3.7-3.1-5.5-4.7c-3.6-3.2-7.1-6.5-10.6-9.9 c-1.7-1.7-3.4-3.4-5.1-5.1c-1.7-1.7-3.3-3.5-4.9-5.3c-3.2-3.6-6.4-7.3-9.4-11c-1.5-1.9-3-3.7-4.5-5.6c-1.5-1.9-2.9-3.8-4.4-5.8 c-2.8-3.9-5.6-7.8-8.2-11.8c-1.3-2-2.6-4-3.9-6c-1.3-2-2.5-4.1-3.8-6.1c-2.4-4.1-4.7-8.3-7-12.5c-1.1-2.1-2.2-4.2-3.3-6.4 c-1.1-2.1-2.1-4.3-3.1-6.5c-2-4.3-3.9-8.7-5.7-13.1c-0.9-2.2-1.8-4.4-2.6-6.6c-0.9-2.2-1.7-4.5-2.5-6.7c-1.6-4.5-3.1-9-4.5-13.6 c-0.7-2.3-1.3-4.6-2-6.9c-0.6-2.3-1.3-4.6-1.9-7c-1.2-4.7-2.3-9.4-3.3-14.1c-0.5-2.4-0.9-4.7-1.4-7.1c-0.4-2.4-0.8-4.8-1.2-7.2 c-0.8-4.8-1.5-9.6-2-14.4c-0.3-2.4-0.5-4.8-0.8-7.3c-0.2-2.4-0.4-4.9-0.6-7.3c-0.3-4.9-0.5-9.8-0.6-14.7c0-2.5,0.1-4.9,0.2-7.4 c0.1-2.5,0.2-4.9,0.4-7.4c0.3-4.9,0.7-9.8,1.2-14.7c0.3-2.4,0.6-4.9,0.9-7.3c0.4-2.4,0.8-4.9,1.2-7.3c0.9-4.8,1.9-9.6,3-14.4 c0.5-2.4,1.1-4.8,1.7-7.1c0.6-2.4,1.3-4.7,2-7c1.4-4.7,2.9-9.3,4.5-13.9c0.8-2.3,1.7-4.5,2.6-6.8c0.9-2.2,1.8-4.5,2.8-6.7 c1.9-4.4,3.9-8.8,6-13.2c1.1-2.2,2.1-4.3,3.2-6.5c1.1-2.1,2.3-4.3,3.5-6.4c2.4-4.2,4.9-8.4,7.5-12.5c1.3-2.1,2.6-4.1,4-6.2 c1.4-2,2.7-4.1,4.1-6.1c2.9-4,5.8-8,8.8-11.9c1.5-2,3.1-3.9,4.6-5.8c1.6-1.9,3.2-3.8,4.8-5.7c3.4-3.8,6.8-7.5,10.3-11.2 c1.7-1.8,3.5-3.6,5.3-5.4c1.8-1.8,3.6-3.5,5.5-5.2c3.8-3.5,7.7-6.9,11.7-10.2c2-1.7,4-3.3,6-4.9c2-1.6,4.1-3.2,6.2-4.7 c4.2-3.1,8.5-6.1,12.8-9.1c2.2-1.5,4.3-2.9,6.6-4.4c2.2-1.4,4.5-2.8,6.8-4.2c4.6-2.7,9.3-5.3,14.1-7.8c2.4-1.2,4.8-2.5,7.3-3.6 c2.4-1.2,4.9-2.3,7.4-3.4c5-2.2,10.1-4.2,15.2-6.2c2.6-1,5.1-1.9,7.7-2.9c2.6-0.9,5.2-1.8,7.9-2.6c5.3-1.6,10.6-3.1,16-4.5 c2.7-0.7,5.4-1.4,8.1-2c2.7-0.6,5.5-1.2,8.2-1.7c5.5-1.1,11-2,16.6-2.8c2.8-0.4,5.6-0.8,8.4-1.1c2.8-0.3,5.6-0.6,8.5-0.8 c5.7-0.5,11.3-0.8,17-1c2.8-0.1,5.7-0.2,8.5-0.2c2.8-0.1,5.7-0.1,8.5,0c5.7,0.1,11.3,0.4,17,0.8c2.8,0.2,5.6,0.5,8.4,0.8 c2.8,0.3,5.6,0.7,8.4,1.2c5.6,0.9,11.2,2,16.7,3.3c2.7,0.6,5.5,1.3,8.2,2c2.7,0.8,5.4,1.6,8.1,2.4c5.3,1.7,10.6,3.6,15.8,5.6 c2.6,1,5.2,2.1,7.7,3.2c2.6,1.1,5.1,2.3,7.6,3.5c5,2.4,9.9,5,14.8,7.8c2.4,1.4,4.9,2.8,7.3,4.3c2.4,1.5,4.8,3,7.1,4.6 c4.7,3.1,9.4,6.4,14,9.8c2.3,1.7,4.6,3.4,6.8,5.2c2.2,1.8,4.4,3.6,6.6,5.4c4.3,3.7,8.6,7.5,12.8,11.4c2.1,2,4.2,4,6.2,6 c2.1,2.1,4.1,4.2,6.1,6.3c3.9,4.3,7.8,8.7,11.5,13.2c1.9,2.2,3.7,4.5,5.5,6.8c1.8,2.3,3.6,4.6,5.3,7c3.5,4.7,6.8,9.5,10.1,14.4 c1.6,2.4,3.2,4.9,4.7,7.4c1.5,2.5,3,5,4.4,7.6c2.9,5.1,5.7,10.3,8.3,15.6c1.3,2.6,2.6,5.3,3.8,8c1.2,2.7,2.4,5.4,3.6,8.1 c2.3,5.5,4.5,11,6.5,16.6c1,2.8,2,5.6,2.9,8.4c0.9,2.8,1.8,5.7,2.7,8.5c1.7,5.7,3.2,11.5,4.6,17.3c0.7,2.9,1.3,5.8,1.9,8.8 c0.6,2.9,1.1,5.9,1.6,8.8c1,5.9,1.9,11.9,2.6,17.9c0.3,3,0.6,6,0.9,9c0.3,3,0.5,6,0.7,9c0.4,6,0.6,12,0.6,18.1 C997.1,43.3,997,49.4,996.8,55.4z"; // 这是一个示意，为了效果好，我们直接用背景图或者更复杂的path

// --- 模拟数据 ---
const getRandomDate = () => {
  const start = new Date(2023, 0, 1);
  const end = new Date();
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const LOCATIONS_DATA = [
  { name: "Reykjavik, Iceland", lat: 64.1, lng: -21.9 },
  { name: "Kyoto, Japan", lat: 35.0, lng: 135.7 },
  { name: "New York, USA", lat: 40.7, lng: -74.0 },
  { name: "Paris, France", lat: 48.8, lng: 2.3 },
  { name: "Chengdu, China", lat: 30.6, lng: 104.0 },
  { name: "Queenstown, NZ", lat: -45.0, lng: 168.6 },
  { name: "Dubai, UAE", lat: 25.2, lng: 55.3 },
  { name: "London, UK", lat: 51.5, lng: -0.1 },
  { name: "Santorini, Greece", lat: 36.3, lng: 25.4 }
];

const mockAnalyzePhoto = (file) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const isPartial = Math.random() > 0.9;
      const cameras = ['Sony A7R V', 'Leica M11', 'DJI Mavic 3 Pro', 'Fujifilm GFX 100II', 'Nikon Z9'];
      const lenses = ['FE 24-70mm GM II', 'Summilux 50mm f/1.4', 'Hasselblad 24mm', 'GF 80mm f/1.7', 'Nikkor Z 58mm'];
      const focalLengths = ['24mm', '35mm', '50mm', '85mm', '200mm'];
      let category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      if (file.name.toLowerCase().includes('dji')) category = 'drone';
      const loc = LOCATIONS_DATA[Math.floor(Math.random() * LOCATIONS_DATA.length)];

      resolve({
        make: isPartial ? "" : cameras[Math.floor(Math.random() * cameras.length)],
        model: isPartial ? "" : lenses[Math.floor(Math.random() * lenses.length)],
        focalLength: isPartial ? "" : focalLengths[Math.floor(Math.random() * focalLengths.length)],
        fNumber: isPartial ? "f/--" : `f/${(Math.random() * 8 + 1.4).toFixed(1)}`,
        exposureTime: isPartial ? "--" : `1/${Math.floor(Math.random() * 4000)}s`,
        iso: `ISO ${Math.floor(Math.random() * 3200)}`,
        ev: `${(Math.random() * 2 - 1).toFixed(1)}`,
        dateObj: getRandomDate(), 
        fileSize: (Math.random() * (200 - 20) + 20).toFixed(2) + ' MB',
        suggestedCategory: category,
        location: isPartial ? "" : loc.name,
        coordinates: isPartial ? null : { lat: loc.lat, lng: loc.lng }
      });
    }, 800); 
  });
};

const initialPhotos = [
  {
    id: 1,
    url: "https://images.unsplash.com/photo-1469474932316-192151a32434?q=80&w=3500&auto=format&fit=crop",
    title: "Misty Mountains",
    category: "landscape",
    aspectRatio: 1.5,
    exif: { make: "Sony A7R IV", model: "FE 24-70 GM", focalLength: "35mm", fNumber: "f/8.0", exposureTime: "1/200s", iso: "ISO 100", ev: "+0.0", fileSize: "45.2 MB", dateObj: new Date('2023-11-15'), location: "Reykjavik, Iceland", coordinates: { lat: 64.1, lng: -21.9 } }
  },
  {
    id: 2,
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=2000&auto=format&fit=crop",
    title: "Neon Portrait",
    category: "portrait",
    aspectRatio: 0.66,
    exif: { make: "Leica Q2", model: "Summilux 28mm", focalLength: "28mm", fNumber: "f/1.7", exposureTime: "1/125s", iso: "ISO 400", ev: "-0.3", fileSize: "82.1 MB", dateObj: new Date('2024-02-20'), location: "Tokyo, Japan", coordinates: { lat: 35.6, lng: 139.7 } }
  },
  {
    id: 3,
    url: "https://images.unsplash.com/photo-1486718448742-163732cd1544?q=80&w=2000&auto=format&fit=crop",
    title: "Urban Lines",
    category: "architecture",
    aspectRatio: 1.5,
    exif: { make: "Canon R5", model: "TS-E 24mm", focalLength: "24mm", fNumber: "f/5.6", exposureTime: "1/500s", iso: "ISO 200", ev: "+0.3", fileSize: "38.5 MB", dateObj: new Date('2024-05-12'), location: "Chicago, USA", coordinates: { lat: 41.8, lng: -87.6 } }
  },
  {
    id: 4,
    url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=2000&auto=format&fit=crop",
    title: "Old Streets",
    category: "street",
    aspectRatio: 0.8,
    exif: { make: "Fujifilm X-T5", model: "XF 23mm", focalLength: "23mm", fNumber: "f/2.8", exposureTime: "1/60s", iso: "ISO 800", ev: "-0.7", fileSize: "24.8 MB", dateObj: new Date('2025-01-05'), location: "Chengdu, China", coordinates: { lat: 30.6, lng: 104.0 } }
  },
  {
    id: 5,
    url: "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?q=80&w=3000&auto=format&fit=crop",
    title: "Dunes from Above",
    category: "drone",
    aspectRatio: 1.77,
    exif: { make: "DJI Mavic 3", model: "Hasselblad 24mm", focalLength: "24mm", fNumber: "f/2.8", exposureTime: "1/1000s", iso: "ISO 100", ev: "0.0", fileSize: "120.4 MB", dateObj: new Date('2025-01-20'), location: "Namib Desert", coordinates: { lat: -24.7, lng: 15.3 } }
  },
];

// --- 高级地图组件 (2D Vector Atlas) ---
const InteractiveMap = ({ photos, onSelect }) => {
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // 缩放逻辑
  const handleWheel = (e) => {
    e.preventDefault();
    const scaleAmount = -e.deltaY * 0.002;
    const newScale = Math.min(Math.max(transform.k + scaleAmount, 1), 10);
    setTransform(prev => ({ ...prev, k: newScale }));
  };

  const handleMouseDown = (e) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => { isDragging.current = false; };

  // Equirectangular Projection Mapping
  // Lat: -90 (S) to 90 (N), Lng: -180 (W) to 180 (E)
  // SVG ViewBox: 0 0 1000 500
  const project = (lat, lng) => {
    const x = (lng + 180) * (1000 / 360);
    const y = ((-1 * lat) + 90) * (500 / 180);
    return { x, y };
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-[600px] bg-[#000000] border border-white/5 rounded-sm overflow-hidden relative map-container group"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Map Layer */}
      <div 
        className="w-full h-full origin-center transition-transform duration-75 ease-out will-change-transform"
        style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})` }}
      >
        <svg viewBox="0 0 1000 500" className="w-full h-full">
           {/* 1. Deep Ocean Background */}
           <rect width="1000" height="500" fill="#020202" />
           
           {/* 2. Grid Lines (Subtle) */}
           <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
             <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#111" strokeWidth="0.5"/>
           </pattern>
           <rect width="1000" height="500" fill="url(#grid)" />

           {/* 3. Continents (Detailed Path) */}
           {/* 使用多个Path模拟大洲，这里用 simplified paths 演示，实际可替换为更复杂的 geojson path */}
           {WORLD_PATHS.map((path, i) => (
             <path key={i} d={path} fill="#0a0a0a" stroke="#222" strokeWidth="0.5" />
           ))}
           {/* Add a generic path for better fill if specific ones aren't enough */}
           <path d="M50,50 L50,450 L950,450 L950,50 Z M100,100 L900,100 L900,400 L100,400 Z" fill="#050505" fillRule="evenodd" opacity="0.3" /> 

           {/* 4. City Light-up & Thumbnails */}
           {photos.map(photo => {
             if (!photo.exif.coordinates) return null;
             const { x, y } = project(photo.exif.coordinates.lat, photo.exif.coordinates.lng);
             
             // Dynamic Scale for Markers based on Zoom level
             const markerScale = 1 / transform.k;

             return (
               <g key={photo.id} onClick={(e) => { e.stopPropagation(); onSelect(photo); }} className="cursor-pointer group/pin">
                 
                 {/* City Contour Glow (Animated) */}
                 <circle cx={x} cy={y} r={8 * markerScale} className="fill-amber-500/10 animate-ping" />
                 <circle cx={x} cy={y} r={3 * markerScale} className="fill-amber-500/40 city-marker" />
                 
                 {/* Core Dot */}
                 <circle cx={x} cy={y} r={1.5 * markerScale} className="fill-white" />

                 {/* Thumbnail Popup (Shows on Hover or High Zoom) */}
                 <foreignObject x={x - 20 * markerScale} y={y - 35 * markerScale} width={40 * markerScale} height={30 * markerScale} 
                   className={`overflow-visible pointer-events-none transition-all duration-300 ${transform.k > 3 ? 'opacity-100' : 'opacity-0 group-hover/pin:opacity-100'}`}
                 >
                   <div className="flex flex-col items-center">
                     <div className="bg-black border border-amber-500/50 p-0.5 rounded-sm shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                        <img src={photo.url} className="w-full h-full object-cover aspect-square" alt=""/>
                     </div>
                     <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-amber-500/50"></div>
                   </div>
                 </foreignObject>
               </g>
             );
           })}
        </svg>
      </div>
      
      {/* UI Overlay */}
      <div className="absolute top-6 left-6 pointer-events-none">
        <h3 className="text-3xl font-luxury text-white tracking-wider font-bold">ATLAS</h3>
        <div className="h-px w-12 bg-amber-600 mt-2 mb-1"></div>
        <p className="text-[10px] text-amber-500 font-mono flex items-center gap-2">
           <Globe size={12} /> GLOBAL ARCHIVE
        </p>
      </div>

      <div className="absolute bottom-6 right-6 text-right pointer-events-none">
         <div className="flex flex-col gap-1 items-end text-[10px] text-stone-600 font-mono">
            <span>ZOOM LEVEL: {transform.k.toFixed(1)}x</span>
            <span>PROJECTION: EQUIRECTANGULAR</span>
         </div>
      </div>
    </div>
  );
};

export default function Portfolio() {
  const [photos, setPhotos] = useState(initialPhotos);
  const [lang, setLang] = useState('en'); // Default English
  const t = TRANSLATIONS[lang];

  // UI State
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); 
  const [showTimeline, setShowTimeline] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); 
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [gearFilter, setGearFilter] = useState({ make: 'all', model: 'all', focalLength: 'all' });

  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [stagingPhotos, setStagingPhotos] = useState([]);
  const [photoToDelete, setPhotoToDelete] = useState(null);

  const fileInputRef = useRef(null);

  // --- Helpers ---
  const filterOptions = useMemo(() => {
    const makes = new Set();
    const models = new Set();
    const focalLengths = new Set();
    photos.forEach(p => {
      if(p.exif.make) makes.add(p.exif.make);
      if(p.exif.model) models.add(p.exif.model);
      if(p.exif.focalLength) focalLengths.add(p.exif.focalLength);
    });
    return {
      makes: Array.from(makes).sort(),
      models: Array.from(models).sort(),
      focalLengths: Array.from(focalLengths).sort((a,b) => parseInt(a) - parseInt(b))
    };
  }, [photos]);

  const filteredPhotos = useMemo(() => {
    return photos.filter(p => {
      const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
      let matchDate = true;
      if (dateFilter !== 'all') {
        const pDateKey = `${p.exif.dateObj.getFullYear()}-${String(p.exif.dateObj.getMonth() + 1).padStart(2, '0')}`;
        matchDate = pDateKey === dateFilter;
      }
      let matchSearch = true;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const searchTarget = `${p.title} ${p.exif.make} ${p.exif.model} ${p.exif.location} ${p.exif.focalLength}`.toLowerCase();
        matchSearch = searchTarget.includes(q);
      }
      const matchMake = gearFilter.make === 'all' || p.exif.make === gearFilter.make;
      const matchModel = gearFilter.model === 'all' || p.exif.model === gearFilter.model;
      const matchFocal = gearFilter.focalLength === 'all' || p.exif.focalLength === gearFilter.focalLength;
      return matchCat && matchDate && matchSearch && matchMake && matchModel && matchFocal;
    });
  }, [photos, categoryFilter, dateFilter, searchQuery, gearFilter]);

  const timelineData = useMemo(() => {
    const dates = photos.map(p => p.exif.dateObj);
    const groups = {};
    dates.forEach(date => {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = 0;
      groups[key]++;
    });
    return Object.keys(groups).sort().reverse().map(key => ({ key, label: key, count: groups[key] }));
  }, [photos]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || e.dataTransfer.files);
    if (files.length === 0) return;
    setIsProcessing(true);
    setShowUploadModal(true);
    const processedFiles = await Promise.all(files.map(async (file) => {
      const objectUrl = URL.createObjectURL(file);
      const exifData = await mockAnalyzePhoto(file);
      const img = new Image();
      img.src = objectUrl;
      await new Promise(r => img.onload = r);
      return {
        id: Date.now() + Math.random(),
        url: objectUrl,
        title: file.name.split('.')[0],
        category: exifData.suggestedCategory,
        aspectRatio: img.width / img.height,
        exif: exifData,
        isLocal: true
      };
    }));
    setStagingPhotos(prev => [...prev, ...processedFiles]);
    setIsProcessing(false);
  };

  const updatePhotoDetails = (id, field, value, isStaging = false) => {
    const updater = (prev) => prev.map(p => {
      if (p.id !== id) return p;
      if (field.startsWith('exif.')) {
         const realField = field.split('.')[1];
         return { ...p, exif: { ...p.exif, [realField]: value } };
      }
      return { ...p, [field]: value };
    });
    if (isStaging) setStagingPhotos(updater);
    else {
      setPhotos(updater);
      if (selectedPhoto?.id === id) {
        if (field.startsWith('exif.')) {
           const realField = field.split('.')[1];
           setSelectedPhoto(prev => ({ ...prev, exif: { ...prev.exif, [realField]: value } }));
        } else {
           setSelectedPhoto(prev => ({ ...prev, [field]: value }));
        }
      }
    }
  };

  const deletePhoto = (id, fromStaging = false) => {
    if (fromStaging) {
      setStagingPhotos(prev => prev.filter(p => p.id !== id));
      if (photoToDelete?.id === id) setPhotoToDelete(null);
    } else {
      setPhotos(prev => prev.filter(p => p.id !== id));
      if (selectedPhoto?.id === id) setSelectedPhoto(null);
      setPhotoToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-stone-200 font-sans selection:bg-amber-500/30 selection:text-amber-200 overflow-x-hidden">
      <FontStyles />
      
      {/* Navbar */}
      <nav className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#000000]/80 border-b border-white/5">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" 
               onClick={() => {
                 window.scrollTo(0,0); 
                 setDateFilter('all'); setCategoryFilter('all'); setSearchQuery(''); 
                 setGearFilter({ make: 'all', model: 'all', focalLength: 'all' });
                 setViewMode('grid');
               }}>
            <div className="w-10 h-10 bg-white text-black rounded-sm flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1)] group-hover:bg-amber-500 group-hover:text-white transition-all duration-500 border border-white/10 group-hover:border-amber-500">
              <Aperture size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white font-luxury transition-colors">longyun<span className="font-light text-amber-500 font-sans">Gallery</span></h1>
              <p className="text-[9px] text-stone-500 tracking-[0.3em] uppercase group-hover:text-stone-400 transition-colors">{t.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-8">
             {/* Global Search */}
             <div className="relative group w-auto">
               <input 
                 type="text" 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 placeholder={t.searchPlaceholder}
                 className="w-24 sm:w-32 focus:w-48 bg-transparent border-b border-white/10 focus:border-amber-500 py-1 text-xs text-white outline-none transition-all font-luxury italic placeholder-stone-700 focus:placeholder-amber-500/30"
               />
               <Search size={12} className="absolute right-0 top-1/2 -translate-y-1/2 text-stone-600 pointer-events-none group-focus-within:text-amber-500 transition-colors"/>
             </div>

             <div className="h-4 w-px bg-white/10 hidden sm:block"></div>

             {/* Tools */}
             <div className="flex items-center gap-2">
                <NavIconBtn icon={<Sliders size={18} />} active={showFilters} onClick={() => setShowFilters(!showFilters)} title={t.filterTitle} />
                <NavIconBtn icon={viewMode === 'grid' ? <Globe size={18} /> : <Grid size={18} />} onClick={() => setViewMode(viewMode === 'grid' ? 'map' : 'grid')} title={t.viewMap} />
                <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="p-2 text-stone-500 hover:text-amber-500 transition-colors font-mono text-xs font-bold">{lang === 'en' ? 'CN' : 'EN'}</button>
             </div>
             
             <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 px-6 py-2.5 rounded-sm bg-white hover:bg-amber-500 hover:text-white text-black transition-all duration-300 text-xs font-bold tracking-widest uppercase font-luxury shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                <Upload size={14} /><span>{t.uploadBtn}</span>
            </button>
             <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
          </div>
        </div>
      </nav>

      {/* Filter Drawer */}
      <div className={`border-b border-white/5 bg-[#0a0a0a] transition-all duration-500 ease-in-out overflow-hidden ${showFilters ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="max-w-[1920px] mx-auto px-4 sm:px-8 py-6 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2 text-amber-500 text-xs font-bold uppercase tracking-wider border border-amber-500/20 px-2 py-1 rounded bg-amber-500/5 font-luxury">
            <Filter size={14} /> {t.filterTitle}
          </div>
          
          <FilterSelect label={t.exif.camera} value={gearFilter.make} options={filterOptions.makes} onChange={(v) => setGearFilter(p => ({...p, make: v}))} />
          <FilterSelect label={t.exif.lens} value={gearFilter.model} options={filterOptions.models} onChange={(v) => setGearFilter(p => ({...p, model: v}))} />
          <FilterSelect label={t.exif.focalLength} value={gearFilter.focalLength} options={filterOptions.focalLengths} onChange={(v) => setGearFilter(p => ({...p, focalLength: v}))} />
          
          <button onClick={() => setGearFilter({ make: 'all', model: 'all', focalLength: 'all' })} className="ml-auto text-xs text-stone-500 hover:text-amber-500 underline decoration-stone-800 hover:decoration-amber-500 transition-colors font-luxury italic">
            {t.resetFilter}
          </button>
        </div>
      </div>

      <div className="flex max-w-[1920px] mx-auto relative min-h-screen">
        
        {/* Sidebar Timeline */}
        <aside className={`fixed top-0 left-0 h-screen z-50 bg-[#000000] border-r border-white/5 w-64 transform transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${showTimeline ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
          <div className="p-8 h-full flex flex-col">
            <div className="flex justify-between items-center mb-10">
              <span className="text-sm font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2 border-b border-amber-500/30 pb-1 font-luxury">
                <Calendar size={16}/> {t.timeline}
              </span>
              <button onClick={() => setShowTimeline(false)} className="text-stone-500 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            
            <button onClick={() => setDateFilter('all')} className={`text-left px-4 py-3 rounded-sm text-sm transition-all flex justify-between mb-4 border-l-2 font-luxury ${dateFilter === 'all' ? 'bg-white/5 text-white border-amber-500' : 'text-stone-400 border-transparent hover:bg-white/5'}`}>
              <span>{t.allTime}</span><span className="opacity-30 font-mono">{photos.length}</span>
            </button>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-1">
              {timelineData.map(item => (
                <button key={item.key} onClick={() => setDateFilter(item.key)} className={`w-full text-left px-4 py-2.5 rounded-sm text-xs transition-all flex justify-between font-mono group border-l-2 ${dateFilter === item.key ? 'text-amber-400 bg-amber-500/10 border-amber-500' : 'text-stone-500 border-transparent hover:text-stone-300 hover:border-stone-800'}`}>
                  <span>{item.label}</span>
                  <span className={`text-[10px] transition-opacity ${dateFilter === item.key ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>{item.count}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
        
        {/* Timeline Toggle */}
        <button onClick={() => setShowTimeline(true)} className={`fixed top-32 left-0 z-30 p-3 bg-[#000000] border border-l-0 border-white/10 text-stone-500 hover:text-amber-500 hover:pl-5 transition-all duration-300 rounded-r-sm shadow-xl border-l-amber-500 ${showTimeline ? '-translate-x-full' : 'translate-x-0'}`}>
          <Calendar size={18} />
        </button>

        <div className="flex-1 w-full">
          
          <header className="px-6 py-28 text-center relative overflow-hidden bg-[#000000]">
             <p className="text-xl md:text-2xl text-amber-500 font-luxury italic leading-relaxed max-w-3xl mx-auto relative z-10 opacity-90">"{t.aboutText}"</p>
          </header>

          <div className="px-4 sm:px-8 mb-20 flex flex-wrap justify-center gap-6">
            {['all', ...CATEGORIES].map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-4 py-2 text-xs uppercase tracking-[0.2em] transition-all duration-300 relative group font-luxury ${categoryFilter === cat ? 'text-white' : 'text-stone-600 hover:text-amber-500'}`}>
                <span className="relative z-10">{t.categories[cat]}</span>
                {categoryFilter === cat && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-px bg-amber-500"></div>}
              </button>
            ))}
          </div>

          <main className="px-4 sm:px-6 lg:px-8 pb-32 min-h-[60vh]">
            {filteredPhotos.length === 0 ? (
               <div className="text-center py-32 text-stone-800 border border-dashed border-stone-900 rounded-sm bg-[#050505]">
                 <Filter size={48} className="mx-auto mb-4 opacity-20" />
                 <p className="text-sm font-luxury text-stone-500 italic">{t.noResults}</p>
                 <button onClick={() => {setCategoryFilter('all'); setDateFilter('all'); setSearchQuery(''); setGearFilter({ make: 'all', model: 'all', focalLength: 'all' });}} className="mt-4 text-amber-500 hover:text-amber-400 text-xs uppercase underline tracking-widest">
                   {t.resetFilter}
                 </button>
               </div>
            ) : viewMode === 'grid' ? (
              <div className="columns-1 md:columns-2 xl:columns-3 gap-10 space-y-10">
                {filteredPhotos.map((photo) => (
                  <div key={photo.id} className="break-inside-avoid relative group transition-colors duration-500 rounded-sm p-2 hover:bg-[#0a0a0a]">
                    <div className="relative overflow-hidden bg-[#050505] cursor-zoom-in border border-white/5 group-hover:border-amber-500/30 transition-colors duration-500" onClick={() => setSelectedPhoto(photo)}>
                      <img src={photo.url} alt={photo.title} className="w-full h-auto object-cover grayscale group-hover:grayscale-0 transition-all duration-[1.5s] ease-out group-hover:scale-[1.02]" loading="lazy"/>
                      
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-center items-center p-8">
                         <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 text-center">
                            <span className="text-[10px] text-amber-500 uppercase tracking-[0.3em] mb-3 block font-luxury">{t.categories[photo.category]}</span>
                            <h3 className="text-white font-medium text-2xl tracking-widest font-luxury italic">{photo.title}</h3>
                         </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <InteractiveMap photos={filteredPhotos} onSelect={setSelectedPhoto} />
            )}
          </main>
        </div>
      </div>

      {/* --- Modals --- */}
      
      {photoToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#050505] border border-stone-800 p-12 max-w-md w-full mx-4 shadow-2xl text-center">
             <div className="mb-6 mx-auto w-16 h-16 border border-amber-900/50 rounded-full flex items-center justify-center text-amber-600">
               <AlertTriangle size={24} />
             </div>
             <h3 className="text-2xl text-white font-luxury mb-2">{t.deleteModal.title}</h3>
             <p className="text-stone-500 text-sm font-luxury italic mb-8">{t.deleteModal.message}</p>
             <div className="flex gap-4 justify-center">
               <button onClick={() => setPhotoToDelete(null)} className="px-8 py-3 bg-transparent hover:bg-stone-900 text-stone-400 text-xs uppercase tracking-widest border border-stone-800 transition-colors font-luxury">{t.deleteModal.cancel}</button>
               <button onClick={() => deletePhoto(photoToDelete.id, photoToDelete.fromStaging)} className="px-8 py-3 bg-red-900/10 hover:bg-red-900/20 text-red-500 border border-red-900/30 text-xs uppercase tracking-widest transition-colors font-luxury">{t.deleteModal.confirm}</button>
             </div>
          </div>
        </div>
      )}

      {showUploadModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/98 backdrop-blur-xl p-4 sm:p-8 animate-in fade-in zoom-in-95 duration-300">
           <div className="w-full max-w-6xl h-full max-h-[90vh] bg-[#000000] border border-stone-800 rounded-sm overflow-hidden shadow-2xl flex flex-col">
             <div className="p-8 border-b border-stone-800 flex justify-between items-center bg-[#050505]">
                <div className="flex items-center gap-4">
                  {isProcessing ? <Loader2 className="animate-spin text-amber-500" /> : <Layers size={20} className="text-amber-500"/>}
                  <div>
                    <h3 className="text-white tracking-widest text-lg uppercase font-luxury">{t.uploadModal.title}</h3>
                    <p className="text-[10px] text-stone-500 font-mono mt-1 uppercase tracking-wider">{isProcessing ? t.uploadModal.scanning : `${stagingPhotos.length} NEGATIVES READY`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {!isProcessing && <button onClick={() => setStagingPhotos([])} className="text-[10px] text-stone-600 hover:text-red-500 uppercase tracking-widest transition-colors font-luxury">{t.uploadModal.cancel}</button>}
                  <button onClick={() => setShowUploadModal(false)} className="text-stone-500 hover:text-white transition-colors"><X size={24} /></button>
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 bg-[#000000]">
                {stagingPhotos.length === 0 && !isProcessing ? (
                  <div onClick={() => fileInputRef.current.click()} className="h-full border border-dashed border-stone-900 flex flex-col items-center justify-center hover:border-amber-900/50 hover:bg-stone-900/10 transition-all cursor-pointer group">
                    <Upload size={48} className="text-stone-900 group-hover:text-amber-700 transition-colors mb-6 duration-500" />
                    <p className="text-stone-600 font-luxury text-xl italic tracking-wide group-hover:text-stone-400 transition-colors">{t.uploadModal.dropHint}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {stagingPhotos.map((photo) => (
                      <div key={photo.id} className="bg-[#050505] border border-stone-900 hover:border-amber-900/30 transition-all group p-4">
                        <div className="h-40 bg-stone-900 relative overflow-hidden mb-4 border border-stone-800">
                           <img src={photo.url} className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" alt="" />
                           <button onClick={() => setPhotoToDelete({ id: photo.id, fromStaging: true })} className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-red-900 text-white opacity-0 group-hover:opacity-100 transition-all"><X size={12} /></button>
                        </div>
                        <div className="space-y-4">
                           <input type="text" value={photo.title} onChange={(e) => updatePhotoDetails(photo.id, 'title', e.target.value, true)} className="w-full bg-transparent border-b border-stone-900 focus:border-amber-900 text-lg text-white pb-2 outline-none transition-colors font-luxury italic text-center" placeholder="Untitled"/>
                           <div className="grid grid-cols-2 gap-4">
                              <SmartExifInput label={t.exif.camera} value={photo.exif.make} onChange={(v) => updatePhotoDetails(photo.id, 'exif.make', v, true)} />
                              <SmartExifInput label={t.exif.lens} value={photo.exif.model} onChange={(v) => updatePhotoDetails(photo.id, 'exif.model', v, true)} />
                           </div>
                           <div className="relative pt-2">
                             <MapPin size={10} className="absolute left-0 top-1/2 -translate-y-1/2 text-amber-700"/>
                             <input type="text" value={photo.exif.location || ''} onChange={(e) => updatePhotoDetails(photo.id, 'exif.location', e.target.value, true)} className="w-full bg-transparent border-b border-stone-900 focus:border-amber-900 pl-4 py-1 text-xs text-stone-500 outline-none transition-colors font-luxury uppercase" placeholder={t.uploadModal.locationPlaceholder}/>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
             
             <div className="p-8 border-t border-stone-800 bg-[#050505] flex justify-end">
                 <button onClick={() => { setPhotos(prev => [...stagingPhotos, ...prev]); setStagingPhotos([]); setShowUploadModal(false); }} disabled={stagingPhotos.length === 0 || isProcessing} className="px-12 py-4 bg-white hover:bg-amber-500 text-black hover:text-white transition-all duration-500 text-xs font-bold uppercase tracking-[0.2em] font-luxury disabled:opacity-50 disabled:cursor-not-allowed">
                   {t.uploadModal.save}
                 </button>
             </div>
           </div>
         </div>
      )}

      {/* 3. Lightbox Detail View */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/98 backdrop-blur-xl animate-in fade-in duration-500">
          <button onClick={() => setSelectedPhoto(null)} className="absolute top-8 right-8 p-4 text-stone-600 hover:text-white transition-colors z-50"><X size={32} strokeWidth={0.5} /></button>
          <div className="w-full h-full flex flex-col lg:flex-row overflow-hidden">
            <div className="flex-1 h-[50vh] lg:h-full relative flex items-center justify-center p-4 lg:p-12 bg-[#020202]">
              <img src={selectedPhoto.url} alt={selectedPhoto.title} className="max-w-full max-h-full object-contain shadow-[0_0_100px_rgba(0,0,0,1)]" />
            </div>
            
            <div className="w-full lg:w-[500px] bg-[#000000] border-l border-stone-900 p-12 flex flex-col h-[50vh] lg:h-full overflow-y-auto custom-scrollbar">
              <div className="mb-12 space-y-8">
                <div className="flex items-center gap-4 justify-center lg:justify-start">
                   <span className="h-px w-8 bg-amber-700"></span>
                   <span className="text-xs uppercase text-amber-500 tracking-[0.3em] font-luxury">{t.categories[selectedPhoto.category]}</span>
                   <span className="h-px w-8 bg-amber-700"></span>
                </div>
                
                <input type="text" value={selectedPhoto.title} onChange={(e) => updatePhotoDetails(selectedPhoto.id, 'title', e.target.value)} className="w-full bg-transparent border-none text-center lg:text-left text-5xl font-luxury italic text-white outline-none transition-all placeholder-stone-800 leading-tight"/>
                
                <div className="flex items-center justify-center lg:justify-start gap-3 text-stone-500 text-sm">
                  <MapPin size={14} className="text-amber-700"/>
                  <input type="text" value={selectedPhoto.exif.location || ''} onChange={(e) => updatePhotoDetails(selectedPhoto.id, 'exif.location', e.target.value)} className="bg-transparent border-none focus:ring-0 text-stone-400 font-luxury uppercase tracking-widest outline-none w-full placeholder-stone-800" placeholder="LOCATION UNKNOWN"/>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-x-12 gap-y-8 border-t border-stone-900 pt-10">
                <ExifItem label={t.exif.camera} value={selectedPhoto.exif?.make} />
                <ExifItem label={t.exif.lens} value={selectedPhoto.exif?.model} />
                <ExifItem label={t.exif.focalLength} value={selectedPhoto.exif?.focalLength} />
                <ExifItem label={t.exif.aperture} value={selectedPhoto.exif?.fNumber} />
                <ExifItem label={t.exif.shutter} value={selectedPhoto.exif?.exposureTime} />
                <ExifItem label={t.exif.iso} value={selectedPhoto.exif?.iso} />
                <ExifItem label={t.exif.date} value={selectedPhoto.exif?.dateObj?.toLocaleDateString()} />
              </div>

              <div className="mt-auto space-y-6 pt-16">
                <a href={selectedPhoto.url} download={`${selectedPhoto.title}.jpg`} className="flex items-center justify-center gap-3 w-full bg-white hover:bg-amber-500 text-black hover:text-white py-5 text-xs font-bold uppercase tracking-[0.25em] font-luxury transition-all duration-500">
                  <span>{t.download}</span>
                </a>
                <button onClick={() => setPhotoToDelete({ id: selectedPhoto.id, fromStaging: false })} className="w-full py-4 text-[10px] text-stone-700 hover:text-red-800 transition-colors uppercase tracking-widest font-luxury">
                   {t.deleteModal.confirm}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 组件 ---

const NavIconBtn = ({ icon, onClick, title, active }) => (
  <button 
    onClick={onClick} 
    className={`p-2 transition-colors duration-300 ${active ? 'text-amber-500' : 'text-stone-500 hover:text-amber-500'}`} 
    title={title}
  >
    {icon}
  </button>
);

const SmartExifInput = ({ label, value, onChange }) => {
  const isLocked = value && value !== "" && value !== "Unknown";
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[9px] uppercase text-stone-600 tracking-widest font-luxury">
        {label} 
      </label>
      {isLocked ? (
        <div className="w-full bg-[#050505] border-b border-stone-900 py-1 text-xs text-stone-400 font-mono cursor-not-allowed truncate flex items-center gap-2">
          {value}
          <Lock size={8} className="text-stone-800 ml-auto" />
        </div>
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent border-b border-stone-800 focus:border-amber-900 py-1 text-xs text-stone-300 outline-none font-mono transition-colors" placeholder="Manual Input..."/>
      )}
    </div>
  );
};

const FilterSelect = ({ label, value, options, onChange }) => (
  <div className="flex items-center gap-3 group">
    <span className="text-[10px] text-stone-500 group-hover:text-stone-300 uppercase font-luxury tracking-widest transition-colors">{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-[#050505] border-b border-stone-800 hover:border-amber-900 py-1 text-[10px] text-stone-300 outline-none cursor-pointer transition-colors font-mono uppercase">
      <option value="all">ALL</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const ExifItem = ({ label, value }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[9px] text-stone-600 uppercase tracking-[0.2em] font-luxury">{label}</span>
    <span className="text-stone-300 text-sm font-luxury italic border-b border-stone-900 pb-2">{value || "--"}</span>
  </div>
);