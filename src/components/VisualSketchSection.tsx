import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  CustomPieceConfig,
  CostBreakdown,
  METAL_LABELS,
  STONE_LABELS,
} from '../types/jewelry';
import {
  Camera,
  Upload,
  Sparkles,
  Maximize2,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  Download,
  Eye,
  Wand2,
  Layers,
  FileText,
  Sliders,
  ChevronRight,
  Cpu,
  Zap,
} from 'lucide-react';

interface Props {
  config: CustomPieceConfig;
  cost: CostBreakdown;
  onChangeConfig?: (updates: Partial<CustomPieceConfig>) => void;
}

export const VisualSketchSection: React.FC<Props> = ({ config, cost, onChangeConfig }) => {
  // Mode: 'describe' (Text prompt) vs 'camera' (Upload from device camera / sketch)
  const [activeTab, setActiveTab] = useState<'describe' | 'camera'>('describe');

  // Text description state - initialized with a rich custom request
  const [designDescription, setDesignDescription] = useState<string>(
    "Initial charm made CEO white silver with pavé stones and heavy bail"
  );

  // Device camera / uploaded sketch state
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [uploadedImageName, setUploadedImageName] = useState<string>('');

  // CAD view angle: 'front' | 'isometric' | 'backplate'
  const [viewAngle, setViewAngle] = useState<'front' | 'isometric' | 'backplate'>('front');

  // AI Generation simulation state
  const [isProcessingAi, setIsProcessingAi] = useState<boolean>(false);
  const [aiStepText, setAiStepText] = useState<string>('');
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Intelligent parser for customer design text
  const parsedDesign = useMemo(() => {
    const text = designDescription.trim();
    const lower = text.toLowerCase();

    // 1. Detect metal alloy override from description
    let detectedMetal = config.metal;
    let detectedColor = config.metalColor;

    if (lower.includes('silver') || lower.includes('925') || lower.includes('white silver')) {
      detectedMetal = 'silver_925';
      detectedColor = 'white';
    } else if (lower.includes('white gold') || lower.includes('white')) {
      detectedColor = 'white';
    } else if (lower.includes('rose gold') || lower.includes('rose') || lower.includes('pink')) {
      detectedColor = 'rose';
    } else if (lower.includes('10k') || lower.includes('10kt')) {
      detectedMetal = 'gold_10k';
      detectedColor = 'yellow';
    } else if (lower.includes('14k') || lower.includes('14kt') || lower.includes('yellow gold') || lower.includes('yellow')) {
      detectedMetal = 'gold_14k';
      detectedColor = 'yellow';
    } else if (lower.includes('platinum')) {
      detectedMetal = 'platinum_950';
      detectedColor = 'white';
    }

    // 2. Extract Letters / Monogram / Initials (e.g. "CEO", "M", "VIP", "777", "D")
    let displayLetters = '';

    // Check for explicit uppercase words of 1 to 5 letters (like "CEO", "VIP", "OG", "KING", "LA", "M")
    // Filter out common stopwords like "A", "I", "CAD"
    const uppercaseWords = text.match(/\b[A-Z0-9]{1,5}\b/g)?.filter(
      (w) => !['CAD', 'A', 'I', 'IN', 'AND', 'THE', 'FOR', 'OF', 'WITH'].includes(w)
    );

    if (uppercaseWords && uppercaseWords.length > 0) {
      displayLetters = uppercaseWords[0];
    } else {
      // Look for patterns like "made CEO", "initial CEO", "letters CEO", "saying CEO", "charm CEO"
      const keywordMatch = text.match(
        /(?:made|initial|initials|letters?|charm|spelled?|says?|name|monogram)\s+['"]?([A-Za-z0-9]{1,6})['"]?/i
      );
      if (keywordMatch && keywordMatch[1]) {
        displayLetters = keywordMatch[1].toUpperCase();
      } else {
        // Look for quoted string: 'CEO' or "CEO"
        const quoteMatch = text.match(/['"]([A-Za-z0-9\s]{1,6})['"]/);
        if (quoteMatch && quoteMatch[1]) {
          displayLetters = quoteMatch[1].trim().toUpperCase();
        } else {
          // Default to first letter or 'M'
          displayLetters = 'CEO';
        }
      }
    }

    // 3. Detect Motifs
    let motifType: 'monogram' | 'cross' | 'crown' | 'wings' | 'dollar' | 'heart' | 'picture' = 'monogram';
    if (lower.includes('cross') || lower.includes('crucifix')) {
      motifType = 'cross';
    } else if (lower.includes('crown') || lower.includes('king') || lower.includes('royal')) {
      motifType = 'crown';
    } else if (lower.includes('wing') || lower.includes('wings') || lower.includes('angel')) {
      motifType = 'wings';
    } else if (lower.includes('dollar') || lower.includes('$') || lower.includes('money')) {
      motifType = 'dollar';
    } else if (lower.includes('heart') || lower.includes('love')) {
      motifType = 'heart';
    } else if (lower.includes('picture') || lower.includes('photo') || lower.includes('medallion')) {
      motifType = 'picture';
    }

    // 4. Detect Stones
    const hasStones = !lower.includes('no stone') && !lower.includes('plain');

    return {
      text,
      displayLetters,
      detectedMetal,
      detectedColor,
      motifType,
      hasStones,
    };
  }, [designDescription, config.metal, config.metalColor]);

  // Quick counter suggestion prompt chips
  const quickIdeas = [
    { label: "CEO Silver Initial", text: "Initial charm made CEO white silver with pavé stones and heavy bail" },
    { label: "Letter 'M' Gold", text: "Script letter 'M' charm in 10k yellow gold with diamond bezel" },
    { label: "Crown Medallion", text: "Royal crown medallion in 14k gold with baguette gemstones" },
    { label: "Cross in Platinum", text: "Classic beveled cross charm in platinum with round pavé stones" },
    { label: "Baguette '$' Dollar", text: "Bust-down iced dollar sign '$' charm with Miami Cuban bail" },
    { label: "Memorial Photo Charm", text: "Round picture frame medallion in yellow gold with micro pavé halo" },
  ];

  // Canvas Drawing Function - Clean White CAD Blueprint Screen
  const renderWhiteCadScreen = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. PURE WHITE CAD BACKGROUND (As explicitly requested by user)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // 2. Subtle Architectural CAD Draft Grid Lines (Clean Grey/Slate)
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = '#f1f5f9'; // Very soft secondary grid
    const gridSize = 20;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Major Architectural Grid Lines (every 100px)
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#e2e8f0'; // Clean drafting grey
    for (let x = 0; x < width; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 100) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // CAD Axis crosshair in center (Precision drafting guide)
    const cx = width / 2;
    const cy = height / 2 + 10;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, 40);
    ctx.lineTo(cx, height - 40);
    ctx.moveTo(40, cy);
    ctx.lineTo(width - 40, cy);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // 3. If Camera / Photo uploaded: render with clean CAD contouring
    if (activeTab === 'camera' && uploadedImageSrc) {
      const img = new Image();
      img.onload = () => {
        const maxDim = 260;
        const scale = Math.min(maxDim / img.width, maxDim / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const dx = cx - drawW / 2;
        const dy = cy - drawH / 2;

        // Shadow under the sketch
        ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;

        // Clean white card behind uploaded sketch
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(dx - 6, dy - 6, drawW + 12, drawH + 12);
        ctx.shadowColor = 'transparent';

        // Draw the uploaded sketch image
        ctx.drawImage(img, dx, dy, drawW, drawH);

        // Architectural cyan blueprint frame around customer sketch
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(dx, dy, drawW, drawH);

        // Technical caliper annotations
        drawCadCalipersOnWhite(ctx, width, height, dx, dy, drawW, drawH);
      };
      img.src = uploadedImageSrc;
      return;
    }

    // 4. Procedural 3D CAD Charm Engine on WHITE Screen
    // Select Palette based on parsed text or config (Silver vs Yellow Gold vs Rose Gold)
    const isSilverOrWhite =
      parsedDesign.detectedColor === 'white' ||
      parsedDesign.detectedMetal === 'silver_925' ||
      parsedDesign.detectedMetal === 'platinum_950';

    const isRoseGold = parsedDesign.detectedColor === 'rose';

    let metalLight = '#fef08a'; // Yellow gold highlight
    let metalBase = '#eab308';  // Rich gold
    let metalDark = '#a16207';  // Gold shadow
    let metalBorder = '#78350f'; // Dark outline

    if (isSilverOrWhite) {
      // White Silver / Platinum Rhodium Palette on white screen
      metalLight = '#ffffff';
      metalBase = '#e2e8f0';
      metalDark = '#94a3b8';
      metalBorder = '#475569';
    } else if (isRoseGold) {
      // Rose Gold Palette
      metalLight = '#ffe4e6';
      metalBase = '#fb7185';
      metalDark = '#9f1239';
      metalBorder = '#881337';
    }

    // Proportional dimensions on canvas
    const charmPixelSize = Math.min(220, Math.max(140, config.heightInches * 65));
    const charmWidthPixel = Math.min(260, Math.max(130, config.widthInches * 65));

    ctx.save();

    // Isometric 3D offset
    const isoX = viewAngle === 'isometric' ? 14 : 0;
    const isoY = viewAngle === 'isometric' ? -12 : 0;

    // Draw Top Bail Connection (for chain)
    ctx.fillStyle = metalDark;
    ctx.strokeStyle = metalBorder;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - 16 + isoX, cy - charmPixelSize / 2 - 38 + isoY, 32, 42, [12, 12, 4, 4]);
    ctx.fill();
    ctx.stroke();

    // Bail Center Hole
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(cx + isoX, cy - charmPixelSize / 2 - 18 + isoY, 9, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 3D Depth Extrusion Wall (for Isometric Angle)
    if (viewAngle === 'isometric') {
      const depthPx = (config.depthMm ?? 3.5) * 3.5;
      ctx.fillStyle = metalDark;
      ctx.strokeStyle = metalBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(cx - charmWidthPixel / 2 + depthPx, cy - charmPixelSize / 2 - depthPx, charmWidthPixel, charmPixelSize, [22]);
      ctx.fill();
      ctx.stroke();
    }

    // BACKPLATE VIEW vs FRONT VIEW
    if (viewAngle === 'backplate') {
      // Honeycomb Breathing Grill Backplate on White Screen
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = metalBorder;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx - charmWidthPixel / 2, cy - charmPixelSize / 2, charmWidthPixel, charmPixelSize, [22]);
      ctx.fill();
      ctx.stroke();

      // Honeycomb Mesh Grid
      ctx.strokeStyle = metalBase;
      ctx.lineWidth = 1.2;
      const hexR = 13;
      for (let hy = cy - charmPixelSize / 2 + 18; hy < cy + charmPixelSize / 2 - 18; hy += hexR * 1.6) {
        for (let hx = cx - charmWidthPixel / 2 + 18; hx < cx + charmWidthPixel / 2 - 18; hx += hexR * 1.8) {
          ctx.beginPath();
          for (let a = 0; a < 6; a++) {
            const angle = (a * Math.PI) / 3;
            const px = hx + hexR * Math.cos(angle);
            const py = hy + hexR * Math.sin(angle);
            if (a === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HONEYCOMB BREATHING CAGE • REAR BENCH VIEW', cx, cy + charmPixelSize / 2 + 24);
    } else {
      // FRONT 2D CAD OR 3D ISOMETRIC VIEW
      // Base Charm Metal Plate with Metallic Gradient
      const grad = ctx.createLinearGradient(
        cx - charmWidthPixel / 2,
        cy - charmPixelSize / 2,
        cx + charmWidthPixel / 2,
        cy + charmPixelSize / 2
      );
      grad.addColorStop(0, metalLight);
      grad.addColorStop(0.5, metalBase);
      grad.addColorStop(1, metalDark);

      // Subtle drop shadow on white canvas
      ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 6;

      ctx.fillStyle = grad;
      ctx.strokeStyle = metalBorder;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx - charmWidthPixel / 2, cy - charmPixelSize / 2, charmWidthPixel, charmPixelSize, [22]);
      ctx.fill();
      ctx.stroke();
      ctx.shadowColor = 'transparent'; // Reset shadow

      // Inner Beveled Border (CAD Matrix Offset Line)
      ctx.strokeStyle = '#0284c7'; // Technical cyan draft line
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(cx - charmWidthPixel / 2 + 10, cy - charmPixelSize / 2 + 10, charmWidthPixel - 20, charmPixelSize - 20, [16]);
      ctx.stroke();

      // Gemstone Pavé Seats (Micro-Prongs)
      if (parsedDesign.hasStones && config.stoneType !== 'none') {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = isSilverOrWhite ? '#64748b' : '#a16207';
        ctx.lineWidth = 0.5;

        // Draw halo of prong-set pavé stones around the border
        const haloStep = 12;
        for (let x = cx - charmWidthPixel / 2 + 16; x <= cx + charmWidthPixel / 2 - 16; x += haloStep) {
          // Top & bottom rows
          ctx.beginPath();
          ctx.arc(x, cy - charmPixelSize / 2 + 15, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x, cy + charmPixelSize / 2 - 15, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        for (let y = cy - charmPixelSize / 2 + 27; y <= cy + charmPixelSize / 2 - 27; y += haloStep) {
          // Left & right columns
          ctx.beginPath();
          ctx.arc(cx - charmWidthPixel / 2 + 15, y, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx + charmWidthPixel / 2 - 15, y, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      // CENTER MOTIF OR CUSTOM INITIALS (e.g. "CEO")
      if (parsedDesign.motifType === 'cross') {
        // Draw 3D Cross
        const crossW = 20;
        const crossH = charmPixelSize * 0.55;
        ctx.fillStyle = isSilverOrWhite ? '#f8fafc' : '#fef08a';
        ctx.strokeStyle = metalBorder;
        ctx.lineWidth = 1.5;
        ctx.fillRect(cx - crossW / 2, cy - crossH / 2, crossW, crossH);
        ctx.fillRect(cx - crossH / 3, cy - crossH / 4, (crossH * 2) / 3, crossW);
        ctx.strokeRect(cx - crossW / 2, cy - crossH / 2, crossW, crossH);
        ctx.strokeRect(cx - crossH / 3, cy - crossH / 4, (crossH * 2) / 3, crossW);
      } else {
        // DRAW DYNAMIC CUSTOM LETTERS (e.g. "CEO")
        const letters = parsedDesign.displayLetters || 'CEO';
        // Compute responsive font size based on letter count
        const fontSize = Math.max(26, Math.min(68, Math.round(charmPixelSize / (letters.length * 0.55))));

        // 3D Extrusion shadow of the letters
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = metalDark;
        ctx.fillText(letters, cx + 2, cy + 2);

        // Letter Face (Silver or Gold Luster)
        ctx.fillStyle = isSilverOrWhite ? '#ffffff' : '#fef08a';
        ctx.strokeStyle = metalBorder;
        ctx.lineWidth = 2;
        ctx.strokeText(letters, cx, cy);
        ctx.fillText(letters, cx, cy);

        // If stones are active, draw micro prongs on the letter face
        if (parsedDesign.hasStones && config.stoneType !== 'none') {
          ctx.fillStyle = '#38bdf8';
          ctx.font = `bold ${Math.max(9, fontSize * 0.22)}px monospace`;
          ctx.fillText('PAVÉ ICED', cx, cy + fontSize * 0.65);
        }
      }
    }

    ctx.restore();

    // 5. Technical CAD Dimension Calipers & Title Block on Clean White Canvas
    drawCadCalipersOnWhite(
      ctx,
      width,
      height,
      cx - charmWidthPixel / 2,
      cy - charmPixelSize / 2,
      charmWidthPixel,
      charmPixelSize
    );
  };

  // Draws architectural dimension calipers & title block in clean drafting colors
  const drawCadCalipersOnWhite = (
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    // Drafting Cyan / Navy caliper lines
    ctx.strokeStyle = '#0284c7';
    ctx.fillStyle = '#0284c7';
    ctx.lineWidth = 1;
    ctx.font = '10px monospace';

    // Top Width Caliper Line
    const dimY = Math.max(24, y - 16);
    ctx.beginPath();
    ctx.moveTo(x, dimY);
    ctx.lineTo(x + w, dimY);
    // Arrows
    ctx.moveTo(x + 5, dimY - 3);
    ctx.lineTo(x, dimY);
    ctx.lineTo(x + 5, dimY + 3);
    ctx.moveTo(x + w - 5, dimY - 3);
    ctx.lineTo(x + w, dimY);
    ctx.lineTo(x + w - 5, dimY + 3);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillText(`WIDTH: ${config.widthInches}" (${Math.round(config.widthInches * 25.4)}mm)`, x + w / 2, dimY - 5);

    // Right Height Caliper Line
    const dimX = Math.min(canvasW - 24, x + w + 22);
    ctx.beginPath();
    ctx.moveTo(dimX, y);
    ctx.lineTo(dimX, y + h);
    // Arrows
    ctx.moveTo(dimX - 3, y + 5);
    ctx.lineTo(dimX, y);
    ctx.lineTo(dimX + 3, y + 5);
    ctx.moveTo(dimX - 3, y + h - 5);
    ctx.lineTo(dimX, y + h);
    ctx.lineTo(dimX + 3, y + h - 5);
    ctx.stroke();

    ctx.save();
    ctx.translate(dimX + 14, y + h / 2);
    ctx.rotate(Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(`LENGTH: ${config.heightInches}" (${Math.round(config.heightInches * 25.4)}mm)`, 0, 0);
    ctx.restore();

    // Title Block at Bottom Left in Crisp Clean Architectural Box
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(15, canvasH - 54, 300, 42);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1;
    ctx.strokeRect(15, canvasH - 54, 300, 42);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('GOLDEN JEWELERS MEMPHIS • 3D CAD BLUEPRINT', 22, canvasH - 39);

    const metalLabel =
      parsedDesign.detectedMetal === 'silver_925'
        ? '925 STERLING SILVER'
        : parsedDesign.detectedColor === 'white'
        ? 'WHITE GOLD / RHODIUM'
        : METAL_LABELS[config.metal].toUpperCase();

    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.fillText(`ALLOY: ${metalLabel} • DEPTH: ${config.depthMm}mm`, 22, canvasH - 26);
    ctx.fillText(`DESIGN: "${parsedDesign.displayLetters}" CUSTOM MONOGRAM • SCALE 1:1`, 22, canvasH - 14);
  };

  // Re-draw whenever text, config, or view changes
  useEffect(() => {
    renderWhiteCadScreen();
  }, [config, cost, viewAngle, activeTab, uploadedImageSrc, parsedDesign]);

  // Handle Device Camera / Image upload
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImageName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedImageSrc(event.target.result as string);
          setActiveTab('camera');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // AI CAD Generation Simulation
  const handleSimulateAiCad = () => {
    setIsProcessingAi(true);
    setAiStepText('Reading design description...');

    // If description mentions silver/white, sync config if callback provided
    if (parsedDesign.detectedMetal !== config.metal && onChangeConfig) {
      onChangeConfig({ metal: parsedDesign.detectedMetal, metalColor: parsedDesign.detectedColor });
    }

    setTimeout(() => {
      setAiStepText(`Extracting custom motif & "${parsedDesign.displayLetters}" monogram...`);
    }, 400);

    setTimeout(() => {
      setAiStepText('Synthesizing 3D wireframe mesh & pavé stone seats on white studio canvas...');
    }, 850);

    setTimeout(() => {
      setIsProcessingAi(false);
      setHasGeneratedOnce(true);
      renderWhiteCadScreen();
    }, 1300);
  };

  const handleDownloadCad = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `Golden-Jewelers-CAD-${parsedDesign.displayLetters}-${config.heightInches}x${config.widthInches}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm mt-8">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 font-sans tracking-tight">
              Visual Sketch &amp; AI CAD Generator
            </h3>
            <p className="text-xs text-slate-500">
              Upload an image from device camera or describe custom charm to generate an instant 3D CAD preview for free.
            </p>
          </div>
        </div>

        {/* Mode Switcher: Describe Text vs Upload from Camera */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('describe')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'describe'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Describe Customer Design</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'camera'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-amber-600" />
            <span>Upload Device Camera / Sketch</span>
          </button>
        </div>
      </div>

      {/* INPUTS ROW & INTERACTIVE WHITE CAD BLUEPRINT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5 items-start">
        
        {/* LEFT COLUMN: CONTROLS & DESCRIPTION INPUT */}
        <div className="lg:col-span-5 space-y-4">
          
          {activeTab === 'describe' ? (
            /* TAB 1: DESCRIBE WHAT CUSTOMER WANTS */
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Describe What Customer Wants:
                </label>
                <textarea
                  rows={3}
                  value={designDescription}
                  onChange={(e) => setDesignDescription(e.target.value)}
                  placeholder="e.g. Initial charm made CEO white silver with pavé stones..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 font-sans focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-inner"
                />
              </div>

              {/* Detected Analysis Pill */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[11px]">Detected Letters:</span>
                  <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded font-mono text-xs border border-amber-300">
                    "{parsedDesign.displayLetters}"
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 text-[11px]">Metal:</span>
                  <span className="font-bold text-slate-800 capitalize text-xs">
                    {parsedDesign.detectedColor} {parsedDesign.detectedMetal.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Quick Counter Inspiration Chips */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                  1-Tap Design Ideas:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {quickIdeas.map((idea) => (
                    <button
                      key={idea.label}
                      type="button"
                      onClick={() => {
                        setDesignDescription(idea.text);
                        handleSimulateAiCad();
                      }}
                      className="px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-950 text-left text-[11px] font-semibold transition-colors truncate"
                      title={idea.text}
                    >
                      {idea.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* THE REQUESTED 'GENERATE CAD' BUTTON (SIMULATING AI PROCESSING FOR FREE) */}
              <button
                type="button"
                onClick={handleSimulateAiCad}
                disabled={isProcessingAi}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-60"
              >
                <Cpu className={`w-4 h-4 ${isProcessingAi ? 'animate-spin text-slate-950' : ''}`} />
                <span>{isProcessingAi ? 'AI Processing CAD...' : 'Generate CAD (Simulated AI Preview • Free)'}</span>
              </button>
            </div>
          ) : (
            /* TAB 2: UPLOAD IMAGE FROM DEVICE CAMERA */
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Upload Image from Device Camera:
              </label>

              {/* Hidden file inputs for iPad camera and file picker */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={cameraInputRef}
                onChange={handleCameraCapture}
                className="hidden"
              />
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleCameraCapture}
                className="hidden"
              />

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="py-3 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold flex flex-col items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  <Camera className="w-5 h-5 text-amber-600" />
                  <span>Snap Device Camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-3 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold flex flex-col items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  <Upload className="w-5 h-5 text-slate-600" />
                  <span>Upload Photo</span>
                </button>
              </div>

              {uploadedImageSrc ? (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={uploadedImageSrc}
                      alt="Customer sketch reference"
                      className="w-10 h-10 object-cover rounded-lg border border-slate-300 shadow-xs"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block truncate max-w-[140px]">
                        {uploadedImageName || 'Customer Sketch'}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Camera Photo Loaded
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUploadedImageSrc(null);
                      setUploadedImageName('');
                    }}
                    className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold underline"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center text-xs text-slate-500">
                  <ImageIcon className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                  <span>Tap "Snap Device Camera" to take a photo of the customer's napkin sketch, phone picture, or sample jewelry piece.</span>
                </div>
              )}
            </div>
          )}

          {/* VIEW CONTROLS & SPECIFICATION HIGHLIGHTS */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 text-xs space-y-2">
            <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
              CAD Projection Angle:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setViewAngle('front')}
                className={`py-1.5 px-2 rounded-lg font-bold text-center border transition-all ${
                  viewAngle === 'front'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Front 2D CAD
              </button>
              <button
                type="button"
                onClick={() => setViewAngle('isometric')}
                className={`py-1.5 px-2 rounded-lg font-bold text-center border transition-all ${
                  viewAngle === 'isometric'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                45° 3D Isometric
              </button>
              <button
                type="button"
                onClick={() => setViewAngle('backplate')}
                className={`py-1.5 px-2 rounded-lg font-bold text-center border transition-all ${
                  viewAngle === 'backplate'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Back Cage View
              </button>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>CANVAS: White Studio Drafting</span>
              <span>TRUE SCALE 1:1</span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: THE WHITE CAD BLUEPRINT SCREEN (Requested in White) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-3 shadow-md border-2 border-slate-200 relative overflow-hidden flex flex-col items-center">
          
          {/* Canvas Top Bar Controls on White */}
          <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-200 px-2 text-[11px] font-mono text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-slate-800">WHITE STUDIO CAD VIEWPORT</span>
              <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                {parsedDesign.displayLetters}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadCad}
                className="hover:text-amber-700 transition-colors flex items-center gap-1 font-semibold text-slate-700"
                title="Save CAD Image"
              >
                <Download className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Save CAD</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="hover:text-amber-700 transition-colors p-1 rounded hover:bg-slate-100"
                title="Expand View"
              >
                <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
              </button>
            </div>
          </div>

          {/* THE HIGH-RESOLUTION WHITE CAD CANVAS */}
          <div className="w-full relative flex items-center justify-center min-h-[340px] bg-white rounded-lg border border-slate-200">
            <canvas
              ref={canvasRef}
              width={540}
              height={380}
              className="max-w-full h-auto rounded-lg cursor-crosshair"
            />

            {/* AI Processing Overlay Simulation */}
            {isProcessingAi && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center gap-3 rounded-lg text-slate-800 font-sans p-4 text-center">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
                  <Sparkles className="w-5 h-5 text-amber-600 absolute inset-0 m-auto" />
                </div>
                <div>
                  <span className="font-bold text-sm text-slate-900 block">AI CAD Processor</span>
                  <span className="text-xs text-slate-500 font-mono mt-0.5 block">{aiStepText}</span>
                </div>
              </div>
            )}
          </div>

          {/* Client Presentation Banner Below White CAD View */}
          <div className="w-full mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 px-2 text-[11px] font-sans text-slate-500">
            <div>
              <span className="text-slate-800 font-bold font-mono">
                {config.heightInches}" × {config.widthInches}" {parsedDesign.detectedColor.toUpperCase()} {parsedDesign.detectedMetal.replace('_', ' ').toUpperCase()}
              </span>
              <span className="mx-1.5">•</span>
              <span>{config.stoneType === 'none' ? 'High-Polish Mirror' : STONE_LABELS[config.stoneType].split('(')[0]}</span>
            </div>
            <div className="text-amber-700 font-bold font-mono">
              Ready for Lost-Wax Casting &amp; CNC Milling
            </div>
          </div>

        </div>

      </div>

      {/* FULL SCREEN CLIENT PRESENTATION MODAL */}
      {isFullScreen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4 text-slate-900 font-sans text-xs">
              <span className="font-bold text-base font-serif">GOLDEN JEWELERS MEMPHIS — CLIENT CAD PRESENTATION</span>
              <button
                type="button"
                onClick={() => setIsFullScreen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 text-xs"
              >
                Close Presentation
              </button>
            </div>
            <div className="flex items-center justify-center bg-white p-2 rounded-2xl border border-slate-100">
              <canvas
                ref={(node) => {
                  if (node && canvasRef.current) {
                    const ctx = node.getContext('2d');
                    ctx?.drawImage(canvasRef.current, 0, 0, node.width, node.height);
                  }
                }}
                width={700}
                height={500}
                className="max-w-full h-auto rounded-xl shadow-lg border border-slate-200"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
