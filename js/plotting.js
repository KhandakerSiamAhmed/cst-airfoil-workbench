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
        hovermode: 'closest'
    };

    Plotly.newPlot('main-plot', data, layout, {displayModeBar: false, responsive: true});
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
