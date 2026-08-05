
let state = {
    n: 8,
    N1: 0.5,
    N2: 1.0,
    Au: [0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15],
    Al: [-0.15, -0.15, -0.15, -0.15, -0.15, -0.15, -0.15, -0.15, -0.15],
    dzTE_U: 0.0,
    dzTE_L: 0.0,
    lockRle: false,
    lockTeGap: false,
    modeStSc: false,
    importedPts: null
};

function initUI() {
    initGeometryPlot();
    initDerivativesPlot();
    initResidualsPlot();
    
    document.getElementById('n1-slider').addEventListener('input', (e) => {
        state.N1 = parseFloat(e.target.value);
        document.getElementById('n1-num').value = state.N1.toFixed(4);
        updateAll();
    });
    
    document.getElementById('n1-num').addEventListener('change', (e) => {
        state.N1 = parseFloat(e.target.value);
        document.getElementById('n1-slider').value = state.N1;
        updateAll();
    });

    document.getElementById('n2-slider').addEventListener('input', (e) => {
        state.N2 = parseFloat(e.target.value);
        document.getElementById('n2-num').value = state.N2.toFixed(4);
        updateAll();
    });
    
    document.getElementById('n2-num').addEventListener('change', (e) => {
        state.N2 = parseFloat(e.target.value);
        document.getElementById('n2-slider').value = state.N2;
        updateAll();
    });

    document.getElementById('poly-order').addEventListener('change', (e) => {
        let new_n = parseInt(e.target.value);
        let newAu = new Array(new_n + 1).fill(0);
        let newAl = new Array(new_n + 1).fill(0);
        for(let i=0; i<=Math.min(state.n, new_n); i++) {
            newAu[i] = state.Au[i];
            newAl[i] = state.Al[i];
        }
        state.n = new_n;
        state.Au = newAu;
        state.Al = newAl;
        renderWeightSliders();
        updateAll();
    });

    document.getElementById('lock-rle').addEventListener('change', (e) => {
        state.lockRle = e.target.checked;
        if(state.lockRle) {
            state.Al[0] = -Math.abs(state.Au[0]);
            state.Au[0] = Math.abs(state.Au[0]);
            renderWeightSliders();
            updateAll();
        }
    });

    document.getElementById('lock-te-gap').addEventListener('change', (e) => {
        state.lockTeGap = e.target.checked;
        document.getElementById('te-gap-u').disabled = !state.lockTeGap;
        document.getElementById('te-gap-l').disabled = !state.lockTeGap;
        if (!state.lockTeGap) {
            state.dzTE_U = 0;
            state.dzTE_L = 0;
            document.getElementById('te-gap-u').value = "0.0000";
            document.getElementById('te-gap-l').value = "0.0000";
            updateAll();
        }
    });

    document.getElementById('te-gap-u').addEventListener('change', (e) => {
        state.dzTE_U = parseFloat(e.target.value);
        updateAll();
    });
    
    document.getElementById('te-gap-l').addEventListener('change', (e) => {
        state.dzTE_L = parseFloat(e.target.value);
        updateAll();
    });
    
    document.getElementById('mode-st-sc').addEventListener('change', (e) => {
        state.modeStSc = e.target.checked;
        document.getElementById('label-upper-weights').textContent = state.modeStSc ? 'Thickness Weights (ST)' : 'Upper Surface Weights (Au)';
        document.getElementById('label-lower-weights').textContent = state.modeStSc ? 'Camber Weights (SC)' : 'Lower Surface Weights (Al)';
        renderWeightSliders();
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(e.target.dataset.target).classList.add('active');
        });
    });

    document.getElementById('btn-import').addEventListener('click', () => {
        document.getElementById('file-import').click();
    });
    
    document.getElementById('file-import').addEventListener('change', (e) => {
        let file = e.target.files[0];
        if(!file) return;
        let reader = new FileReader();
        reader.onload = (ev) => {
            try {
                state.importedPts = parseCoordinateFile(ev.target.result);
                fitImported();
                document.querySelector('[data-target="tab-residuals"]').click();
            } catch (err) {
                alert("Error importing file: " + err.message);
            }
        };
        reader.readAsText(file);
    });
    
    document.getElementById('btn-export').addEventListener('click', () => {
        let fmt = document.getElementById('export-format').value;
        let geom = computeGeometry(state.n, state.N1, state.N2, state.Au, state.Al, state.dzTE_U, state.dzTE_L);
        if (fmt === 'dat') {
            downloadFile('airfoil.dat', exportDAT(geom.psi, geom.zeta_U, geom.zeta_L));
        } else if (fmt === 'csv') {
            downloadFile('airfoil.csv', exportCSV(geom.psi, geom.zeta_U, geom.zeta_L));
        } else if (fmt === 'dxf') {
            downloadFile('airfoil.dxf', exportDXF(geom.psi, geom.zeta_U, geom.zeta_L));
        }
    });
    
    document.getElementById('preset-select').addEventListener('change', (e) => {
        if(e.target.value === 'naca0012') {
            generateNACA0012AndFit();
        } else if (e.target.value === 'rae2822') {
            alert("RAE 2822 coordinates not provided. Please import your own file.");
            e.target.value = 'custom';
        }
    });

    renderWeightSliders();
    updateAll();
}

function generateNACA0012AndFit() {
    let pts = { upper: [], lower: [], raw: [] };
    const yt = (x) => 5 * 0.12 * (0.2969 * Math.sqrt(x) - 0.1260 * x - 0.3516 * x*x + 0.2843 * x*x*x - 0.1015 * x*x*x*x);
    for(let i=0; i<=200; i++) {
        let x = 0.5 * (1 - Math.cos(Math.PI * i / 200));
        let z = yt(x);
        pts.upper.push({x, z});
        pts.lower.push({x, -z});
    }
    state.importedPts = pts;
    state.n = 8;
    state.N1 = 0.5;
    state.N2 = 1.0;
    document.getElementById('poly-order').value = "8";
    document.getElementById('n1-slider').value = 0.5;
    document.getElementById('n1-num').value = "0.5000";
    document.getElementById('n2-slider').value = 1.0;
    document.getElementById('n2-num').value = "1.0000";
    fitImported();
}

function fitImported() {
    if (!state.importedPts) return;
    try {
        state.Au = fitCST(state.importedPts.upper, state.N1, state.N2, state.n);
        state.Al = fitCST(state.importedPts.lower, state.N1, state.N2, state.n);
        renderWeightSliders();
        updateAll();
    } catch(err) {
        alert("Fitting failed: " + err.message);
    }
}

function createSlider(idPrefix, label, val, isStSc, onChange) {
    let div = document.createElement('div');
    div.className = 'slider-group';
    div.innerHTML = `
        <span class="slider-label text-xs">${label}</span>
        <input type="range" id="${idPrefix}-slider" class="slider-input" min="-0.5" max="0.5" step="0.001" value="${val}">
        <input type="number" id="${idPrefix}-num" class="number-input font-mono" step="0.0001" value="${val.toFixed(4)}">
    `;
    let slider = div.querySelector(`#${idPrefix}-slider`);
    let num = div.querySelector(`#${idPrefix}-num`);
    
    const updateVal = (v) => {
        slider.value = v;
        num.value = v.toFixed(4);
        onChange(v);
    };
    
    slider.addEventListener('input', (e) => updateVal(parseFloat(e.target.value)));
    num.addEventListener('change', (e) => updateVal(parseFloat(e.target.value)));
    return div;
}

function renderWeightSliders() {
    const auContainer = document.getElementById('au-sliders');
    const alContainer = document.getElementById('al-sliders');
    auContainer.innerHTML = '';
    alContainer.innerHTML = '';
    
    for(let i=0; i<=state.n; i++) {
        let valU, valL;
        if(state.modeStSc) {
            valU = state.Au[i] - state.Al[i];
            valL = (state.Au[i] + state.Al[i])/2;
        } else {
            valU = state.Au[i];
            valL = state.Al[i];
        }

        let sliderU = createSlider(`au-${i}`, `${state.modeStSc?'ST':'Au'}${i}`, valU, state.modeStSc, (v) => {
            if(state.modeStSc) {
                let sc = (state.Au[i] + state.Al[i])/2;
                state.Au[i] = sc + v/2;
                state.Al[i] = sc - v/2;
            } else {
                state.Au[i] = v;
            }
            if (state.lockRle && i === 0) {
                state.Al[0] = -Math.abs(state.Au[0]);
                renderWeightSliders();
            }
            updateAll();
        });
        auContainer.appendChild(sliderU);
        
        let sliderL = createSlider(`al-${i}`, `${state.modeStSc?'SC':'Al'}${i}`, valL, state.modeStSc, (v) => {
            if(state.modeStSc) {
                let st = state.Au[i] - state.Al[i];
                state.Au[i] = v + st/2;
                state.Al[i] = v - st/2;
            } else {
                state.Al[i] = v;
            }
            if (state.lockRle && i === 0) {
                state.Au[0] = Math.abs(state.Al[0]);
                renderWeightSliders();
            }
            updateAll();
        });
        if(state.lockRle && i === 0 && !state.modeStSc) {
            sliderL.querySelector('input[type="range"]').disabled = true;
            sliderL.querySelector('input[type="number"]').disabled = true;
        }
        alContainer.appendChild(sliderL);
    }
}

function updateAll() {
    let geom = computeGeometry(state.n, state.N1, state.N2, state.Au, state.Al, state.dzTE_U, state.dzTE_L);
    
    updateGeometryPlot(geom, state.importedPts);
    updateDerivativesPlot(geom);
    
    if (state.importedPts) {
        let evalU = evaluateCST(state.importedPts.upper.map(p=>p.x), state.N1, state.N2, state.Au, state.dzTE_U, state.n);
        let evalL = evaluateCST(state.importedPts.lower.map(p=>p.x), state.N1, state.N2, state.Al, state.dzTE_L, state.n);
        
        let resU = { x: state.importedPts.upper.map(p=>p.x), y: evalU.map((v, i) => v - state.importedPts.upper[i].z) };
        let resL = { x: state.importedPts.lower.map(p=>p.x), y: evalL.map((v, i) => v - state.importedPts.lower[i].z) };
        updateResidualsPlot(resU, resL);
    }
    
    document.getElementById('hud-tc').textContent = `t/c: ${(geom.max_t*100).toFixed(1)}% @ x/c=${geom.max_t_x.toFixed(2)}`;
    document.getElementById('hud-hc').textContent = `h/c: ${(geom.max_h*100).toFixed(1)}% @ x/c=${geom.max_h_x.toFixed(2)}`;
    document.getElementById('hud-rle').textContent = `R_LE: ${(geom.R_LE_U).toFixed(4)}`;
    document.getElementById('hud-beta').textContent = `Beta_U/L: ${geom.beta_U.toFixed(1)}° / ${geom.beta_L.toFixed(1)}°`;

    let tbody = document.getElementById('coord-table-body');
    let rowsHtml = '';
    for(let i=0; i<geom.psi.length; i++) {
        rowsHtml += `<tr>
            <td>${geom.psi[i].toFixed(4)}</td>
            <td>${geom.zeta_U[i].toFixed(4)}</td>
            <td>${geom.zeta_L[i].toFixed(4)}</td>
            <td>${geom.camber[i].toFixed(4)}</td>
            <td>${geom.thickness[i].toFixed(4)}</td>
        </tr>`;
    }
    tbody.innerHTML = rowsHtml;
}

document.addEventListener('DOMContentLoaded', initUI);
