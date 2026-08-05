const colorAmber = '#FFB800';
const colorCyan = '#00E5FF';
const colorRed = '#FF4D4D';
const colorMuted = '#8F95A5';
const colorSurface = '#0F1115';
const colorGrid = '#2A2F3D';

function initGeometryPlot() {
    let data = [
        { x: [], y: [], name: 'Upper', line: {color: colorAmber, width: 2} },
        { x: [], y: [], name: 'Lower', line: {color: colorCyan, width: 2} },
        { x: [], y: [], name: 'Camber', line: {color: colorRed, width: 1, dash: 'dash'} },
        { x: [], y: [], mode: 'markers', name: 'Target Upper', marker: {color: colorAmber, size: 4, symbol: 'circle-open'}, visible: false },
        { x: [], y: [], mode: 'markers', name: 'Target Lower', marker: {color: colorCyan, size: 4, symbol: 'circle-open'}, visible: false }
    ];

    let layout = {
        margin: {t: 20, b: 40, l: 40, r: 20},
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        xaxis: { 
            title: 'x/c', 
            gridcolor: colorGrid, 
            zerolinecolor: colorGrid, 
            tickfont: {color: colorMuted, family: 'JetBrains Mono'},
            titlefont: {color: colorMuted},
            range: [-0.05, 1.05]
        },
        yaxis: { 
            title: 'z/c', 
            gridcolor: colorGrid, 
            zerolinecolor: colorGrid, 
            tickfont: {color: colorMuted, family: 'JetBrains Mono'},
            titlefont: {color: colorMuted},
            scaleanchor: 'x', 
            scaleratio: 1,
            range: [-0.25, 0.25]
        },
        showlegend: false,
        hovermode: 'closest',
        dragmode: 'pan'
    };

    Plotly.newPlot('main-plot', data, layout, {displayModeBar: false, responsive: true, scrollZoom: true});
}

function updateGeometryPlot(geom, importedPts = null) {
    let update = {
        x: [geom.psi, geom.psi, geom.psi],
        y: [geom.zeta_U, geom.zeta_L, geom.camber]
    };
    Plotly.update('main-plot', update, {}, [0, 1, 2]);

    if (importedPts) {
        let updateImport = {
            x: [importedPts.upper.map(p => p.x), importedPts.lower.map(p => p.x)],
            y: [importedPts.upper.map(p => p.z), importedPts.lower.map(p => p.z)],
            visible: [true, true]
        };
        Plotly.update('main-plot', updateImport, {}, [3, 4]);
    } else {
        Plotly.update('main-plot', {visible: [false, false]}, {}, [3, 4]);
    }
}

function initDerivativesPlot() {
    let data = [
        { x: [], y: [], name: 'dz/dx U', line: {color: colorAmber} },
        { x: [], y: [], name: 'dz/dx L', line: {color: colorCyan} },
        { x: [], y: [], name: 'd²z/dx² U', line: {color: colorAmber, dash: 'dot'}, yaxis: 'y2' },
        { x: [], y: [], name: 'd²z/dx² L', line: {color: colorCyan, dash: 'dot'}, yaxis: 'y2' },
        { x: [], y: [], name: 'Kappa U', line: {color: colorAmber, dash: 'dash'}, yaxis: 'y3' },
        { x: [], y: [], name: 'Kappa L', line: {color: colorCyan, dash: 'dash'}, yaxis: 'y3' }
    ];

    let layout = {
        margin: {t: 20, b: 40, l: 50, r: 50},
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        showlegend: true,
        legend: { font: {color: colorMuted}, orientation: 'h', y: -0.2 },
        xaxis: { gridcolor: colorGrid, tickfont: {color: colorMuted}, range: [0, 1] },
        yaxis: { title: 'Slope', gridcolor: colorGrid, tickfont: {color: colorMuted} },
        yaxis2: { title: '2nd Deriv', overlaying: 'y', side: 'right', showgrid: false, tickfont: {color: colorMuted} },
        yaxis3: { title: 'Curvature', overlaying: 'y', side: 'right', position: 0.9, showgrid: false, tickfont: {color: colorMuted}, visible: false }
    };
    
    Plotly.newPlot('plot-derivatives', data, layout, {displayModeBar: false, responsive: true});
}

function updateDerivativesPlot(geom) {
    let update = {
        x: [geom.psi, geom.psi, geom.psi, geom.psi, geom.psi, geom.psi],
        y: [geom.dZdx_U, geom.dZdx_L, geom.d2Zdx2_U, geom.d2Zdx2_L, geom.kappa_U, geom.kappa_L]
    };
    if (document.getElementById('plot-derivatives').data) {
        Plotly.update('plot-derivatives', update);
    }
}

function initResidualsPlot() {
    let data = [
        { x: [], y: [], name: 'Residual U', mode: 'lines', line: {color: colorAmber} },
        { x: [], y: [], name: 'Residual L', mode: 'lines', line: {color: colorCyan} },
        { x: [0, 1], y: [0.003, 0.003], name: '+Tol', mode: 'lines', line: {color: colorRed, dash: 'dash'} },
        { x: [0, 1], y: [-0.003, -0.003], name: '-Tol', mode: 'lines', line: {color: colorRed, dash: 'dash'} }
    ];
    let layout = {
        margin: {t: 20, b: 40, l: 50, r: 20},
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        showlegend: false,
        xaxis: { gridcolor: colorGrid, tickfont: {color: colorMuted}, range: [0, 1] },
        yaxis: { title: 'Delta z/c', gridcolor: colorGrid, tickfont: {color: colorMuted} }
    };
    Plotly.newPlot('plot-residuals', data, layout, {displayModeBar: false, responsive: true});
}

function updateResidualsPlot(resU, resL) {
    let update = {
        x: [resU.x, resL.x],
        y: [resU.y, resL.y]
    };
    if (document.getElementById('plot-residuals').data) {
        Plotly.update('plot-residuals', update, {}, [0, 1]);
    }
}

// ── Zoom helpers for main-plot ──────────────────────────────────────────────
const ZOOM_DEFAULT = { xMin: -0.05, xMax: 1.05, yMin: -0.25, yMax: 0.25 };
const ZOOM_FACTOR  = 0.25; // fraction to shrink/expand per step

function _getMainPlotRange() {
    const el = document.getElementById('main-plot');
    if (!el || !el.layout) return { ...ZOOM_DEFAULT };
    const xl = el.layout.xaxis || {};
    const yl = el.layout.yaxis || {};
    return {
        xMin: (xl.range || [ZOOM_DEFAULT.xMin, ZOOM_DEFAULT.xMax])[0],
        xMax: (xl.range || [ZOOM_DEFAULT.xMin, ZOOM_DEFAULT.xMax])[1],
        yMin: (yl.range || [ZOOM_DEFAULT.yMin, ZOOM_DEFAULT.yMax])[0],
        yMax: (yl.range || [ZOOM_DEFAULT.yMin, ZOOM_DEFAULT.yMax])[1]
    };
}

function zoomMainPlot(direction) {
    // direction: +1 = zoom in, -1 = zoom out
    let { xMin, xMax, yMin, yMax } = _getMainPlotRange();
    const xCtr = (xMin + xMax) / 2;
    const yCtr = (yMin + yMax) / 2;
    const xHalf = (xMax - xMin) / 2;
    const yHalf = (yMax - yMin) / 2;
    const scale = direction > 0 ? (1 - ZOOM_FACTOR) : (1 + ZOOM_FACTOR);
    Plotly.relayout('main-plot', {
        'xaxis.range': [xCtr - xHalf * scale, xCtr + xHalf * scale],
        'yaxis.range': [yCtr - yHalf * scale, yCtr + yHalf * scale]
    });
}

function resetMainPlotZoom() {
    Plotly.relayout('main-plot', {
        'xaxis.range': [ZOOM_DEFAULT.xMin, ZOOM_DEFAULT.xMax],
        'yaxis.range': [ZOOM_DEFAULT.yMin, ZOOM_DEFAULT.yMax]
    });
}

// ── Cp (Pressure Coefficient) Plot ──────────────────────────────────────────
function initCpPlot() {
    const data = [
        { x: [], y: [], name: '-Cp Upper', mode: 'lines', line: { color: colorAmber, width: 2 } },
        { x: [], y: [], name: '-Cp Lower', mode: 'lines', line: { color: colorCyan,  width: 2 } },
    ];
    const layout = {
        margin: { t: 20, b: 48, l: 54, r: 20 },
        paper_bgcolor: 'transparent',
        plot_bgcolor:  'transparent',
        showlegend: true,
        legend: { font: { color: colorMuted, size: 11 }, orientation: 'h', y: -0.22 },
        xaxis: {
            title: 'x/c',
            gridcolor: colorGrid,
            zerolinecolor: colorGrid,
            tickfont: { color: colorMuted, family: 'JetBrains Mono' },
            titlefont: { color: colorMuted },
            range: [0, 1]
        },
        yaxis: {
            title: '−Cp',
            autorange: 'reversed',          // convention: suction (-Cp) plotted upward
            gridcolor: colorGrid,
            zerolinecolor: colorGrid,
            tickfont: { color: colorMuted, family: 'JetBrains Mono' },
            titlefont: { color: colorMuted },
        }
    };
    Plotly.newPlot('plot-cp', data, layout, { displayModeBar: false, responsive: true });
}

function updateCpPlot(result) {
    if (!document.getElementById('plot-cp').data) return;
    Plotly.update('plot-cp', {
        x: [result.x_upper, result.x_lower],
        y: [result.Cp_upper.map(v => -v), result.Cp_lower.map(v => -v)]
    }, {}, [0, 1]);
}

