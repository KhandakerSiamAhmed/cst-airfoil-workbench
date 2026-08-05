
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
    importedPts: null,
    alpha: 0.0
};

function initUI() {
    initGeometryPlot();
    initDerivativesPlot();
    initResidualsPlot();
    initCpPlot();
    initSolver();
    
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
        } else if (fmt === 'sldcrv') {
            downloadFile('airfoil.sldcrv', exportSLDCRV(geom.psi, geom.zeta_U, geom.zeta_L));
        }
    });
    

    document.getElementById('preset-select').addEventListener('change', (e) => {
        let group = document.getElementById('naca-input-group');
        if (e.target.value === 'naca') {
            group.style.display = '';
            let digits = document.getElementById('naca-digits').value.trim();
            if (/^\d{4}$/.test(digits)) generateNACAAndFit(digits);
        } else if (e.target.value === 'rae2822') {
            group.style.display = 'none';
            state.importedPts = getRAE2822Pts();
            fitImported();
            document.querySelector('[data-target="tab-residuals"]').click();
        } else {
            group.style.display = 'none';
        }
    });

    document.getElementById('naca-digits').addEventListener('input', (e) => {
        let val = e.target.value.trim();
        if (/^\d{4}$/.test(val)) generateNACAAndFit(val);
    });

    document.getElementById('naca-digits').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            let val = e.target.value.trim().padStart(4, '0');
            if (/^\d{1,4}$/.test(val)) generateNACAAndFit(val);
        }
    });

    document.getElementById('btn-zoom-in').addEventListener('click', () => zoomMainPlot(+1));
    document.getElementById('btn-zoom-out').addEventListener('click', () => zoomMainPlot(-1));
    document.getElementById('btn-zoom-reset').addEventListener('click', () => resetMainPlotZoom());

    renderWeightSliders();
    updateAll();
}

// ── Solver wiring ────────────────────────────────────────────────────────────
function initSolver() {
    const alphaSlider = document.getElementById('alpha-slider');
    const alphaNum    = document.getElementById('alpha-num');

    alphaSlider.addEventListener('input', (e) => {
        state.alpha = parseFloat(e.target.value);
        alphaNum.value = state.alpha.toFixed(1);
        if (document.getElementById('solver-auto').checked) runAndUpdateSolver();
    });

    alphaNum.addEventListener('change', (e) => {
        state.alpha = parseFloat(e.target.value);
        alphaSlider.value = state.alpha;
        if (document.getElementById('solver-auto').checked) runAndUpdateSolver();
    });

    document.getElementById('btn-run-solver').addEventListener('click', () => {
        runAndUpdateSolver();
    });
}

function runAndUpdateSolver() {
    const statusEl = document.getElementById('solver-status');
    const geom = computeGeometry(state.n, state.N1, state.N2, state.Au, state.Al, state.dzTE_U, state.dzTE_L);
    try {
        statusEl.textContent = 'Running…';
        statusEl.style.color = 'var(--text-muted)';
        const result = runSolver(geom, state.alpha);
        document.getElementById('out-cl').value = result.Cl.toFixed(4);
        document.getElementById('out-cm').value = result.Cm_qc.toFixed(4);
        updateCpPlot(result);
        // Switch to Cp tab automatically if not already there
        const cpTab = document.querySelector('[data-target="tab-cp"]');
        if (cpTab && !cpTab.classList.contains('active')) {
            cpTab.click();
        }
        statusEl.textContent = `α=${state.alpha.toFixed(1)}° • inviscid panel method`;
        statusEl.style.color = 'var(--accent-cyan)';
    } catch (err) {
        statusEl.textContent = 'Error: ' + err.message;
        statusEl.style.color = 'var(--accent-red)';
    }
}

// ── NACA 4-digit generator ───────────────────────────────────────────────────
// Uses the closed-TE thickness formula (last coeff -0.1036 instead of -0.1015)
// so yt(1) = 0 exactly. This prevents b_val = yt/C → ∞ near the TE which
// was causing the oscillating CST fit in the original code.
function generateNACAAndFit(digits) {
    digits = (digits || '0012').trim().padStart(4, '0');
    let m    = parseInt(digits[0])     / 100;  // max camber fraction
    let p    = parseInt(digits[1])     / 10;   // max camber position fraction
    let tmax = parseInt(digits.slice(2)) / 100; // max thickness fraction

    // Closed-TE: 0.2969-0.1260-0.3516+0.2843-0.1036 = 0.0000 ✓
    const yt = (x) => 5 * tmax * (
        0.2969 * Math.sqrt(x) - 0.1260 * x - 0.3516 * x*x + 0.2843 * x*x*x - 0.1036 * x*x*x*x
    );

    let pts = { upper: [], lower: [], raw: [] };
    for (let i = 0; i <= 200; i++) {
        let x  = 0.5 * (1 - Math.cos(Math.PI * i / 200));
        let yc = 0;
        if (m > 0 && p > 0) {
            yc = (x < p)
                ? (m / (p * p)) * (2 * p * x - x * x)
                : (m / ((1-p) * (1-p))) * (1 - 2*p + 2*p*x - x*x);
        }
        pts.upper.push({ x, z: yc + yt(x) });
        pts.lower.push({ x, z: yc - yt(x) });
    }

    state.importedPts = pts;
    state.n  = 8;
    state.N1 = 0.5;
    state.N2 = 1.0;
    document.getElementById('poly-order').value  = '8';
    document.getElementById('n1-slider').value   = 0.5;
    document.getElementById('n1-num').value      = '0.5000';
    document.getElementById('n2-slider').value   = 1.0;
    document.getElementById('n2-num').value      = '1.0000';
    fitImported();
}

// ── RAE 2822 built-in coordinates ────────────────────────────────────────────
// Cook, McDonald & Firmin (1979) AGARD-AR-138 dataset
function getRAE2822Pts() {
    const upper = [
        {x:0.000,z:0.000},{x:0.005,z:0.0094},{x:0.010,z:0.0133},{x:0.025,z:0.0213},
        {x:0.050,z:0.0301},{x:0.075,z:0.0368},{x:0.100,z:0.0422},{x:0.125,z:0.0465},
        {x:0.150,z:0.0500},{x:0.175,z:0.0529},{x:0.200,z:0.0554},{x:0.250,z:0.0592},
        {x:0.300,z:0.0619},{x:0.350,z:0.0637},{x:0.400,z:0.0643},{x:0.450,z:0.0639},
        {x:0.500,z:0.0625},{x:0.550,z:0.0600},{x:0.600,z:0.0564},{x:0.650,z:0.0515},
        {x:0.700,z:0.0455},{x:0.750,z:0.0382},{x:0.800,z:0.0299},{x:0.850,z:0.0207},
        {x:0.900,z:0.0115},{x:0.950,z:0.0039},{x:0.975,z:0.0013},{x:1.000,z:0.0013}
    ];
    const lower = [
        {x:0.000,z:0.000},{x:0.005,z:-0.0094},{x:0.010,z:-0.0120},{x:0.025,z:-0.0174},
        {x:0.050,z:-0.0232},{x:0.075,z:-0.0275},{x:0.100,z:-0.0305},{x:0.125,z:-0.0327},
        {x:0.150,z:-0.0346},{x:0.175,z:-0.0360},{x:0.200,z:-0.0370},{x:0.250,z:-0.0381},
        {x:0.300,z:-0.0381},{x:0.350,z:-0.0374},{x:0.400,z:-0.0358},{x:0.450,z:-0.0336},
        {x:0.500,z:-0.0308},{x:0.550,z:-0.0276},{x:0.600,z:-0.0241},{x:0.650,z:-0.0204},
        {x:0.700,z:-0.0165},{x:0.750,z:-0.0127},{x:0.800,z:-0.0090},{x:0.850,z:-0.0056},
        {x:0.900,z:-0.0026},{x:0.950,z:-0.0002},{x:0.975,z:0.0005},{x:1.000,z:-0.0013}
    ];
    return { upper, lower, raw: [...upper, ...lower] };
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

    // Re-run solver if auto mode is on
    if (document.getElementById('solver-auto') && document.getElementById('solver-auto').checked) {
        runAndUpdateSolver();
    }
}

document.addEventListener('DOMContentLoaded', initUI);
