// ─────────────────────────────────────────────────────────────────────────────
// Hess-Smith Panel Method (2-D, inviscid, incompressible)
// Ref: Katz & Plotkin "Low-Speed Aerodynamics" Ch.11
//
// Convention:
//   - Airfoil is defined by upper + lower surface z(x) arrays from TE→LE→TE
//     (Selig format going around the body)
//   - Alpha is angle of attack in DEGREES
//
// Returns: { Cl, Cm_qc, Cp_upper, Cp_lower, x_upper, x_lower }
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a closed-body panel representation from the CST geometry arrays.
 * Panels go counter-clockwise (upper: LE→TE, lower: TE→LE reversed).
 * We close the body at the trailing edge.
 *
 * @param {number[]} x_arr   - x/c stations (psi), length N+1
 * @param {number[]} zU_arr  - upper z/c, length N+1
 * @param {number[]} zL_arr  - lower z/c, length N+1
 * @param {number}   N_panels - desired number of panels (even number)
 * @returns {Object} panel geometry
 */
function buildPanels(x_arr, zU_arr, zL_arr, N_panels) {
    // Sample on a cosine-clustered grid (independent of input resolution)
    const Np2 = Math.floor(N_panels / 2);
    const pts = []; // [x, z] going TE→upper→LE→lower→TE (clockwise for external flow)

    // Upper surface: TE (i=Np2) → LE (i=0)
    for (let i = Np2; i >= 0; i--) {
        const t = i / Np2;
        const psi = 0.5 * (1 - Math.cos(Math.PI * t));
        pts.push([_interp(x_arr, zU_arr, psi, true), _interp(x_arr, zU_arr, psi, false)]);
    }
    // Lower surface: LE (i=0) → TE (i=Np2), skip duplicated LE point
    for (let i = 1; i <= Np2; i++) {
        const t = i / Np2;
        const psi = 0.5 * (1 - Math.cos(Math.PI * t));
        pts.push([_interp(x_arr, zL_arr, psi, true), _interp(x_arr, zL_arr, psi, false)]);
    }

    const N = pts.length - 1; // number of panels (last pt == first pt to close)
    const xm = new Float64Array(N), zm = new Float64Array(N);
    const len = new Float64Array(N), sinA = new Float64Array(N), cosA = new Float64Array(N);
    const nx = new Float64Array(N), nz = new Float64Array(N); // outward normals

    for (let i = 0; i < N; i++) {
        const x1 = pts[i][0],   z1 = pts[i][1];
        const x2 = pts[i+1][0], z2 = pts[i+1][1];
        xm[i] = 0.5 * (x1 + x2);
        zm[i] = 0.5 * (z1 + z2);
        const dx = x2 - x1, dz = z2 - z1;
        len[i] = Math.sqrt(dx*dx + dz*dz);
        sinA[i] = dz / len[i];
        cosA[i] = dx / len[i];
        // outward normal (for CW body, normal points outward = rotated 90° CCW from panel dir)
        nx[i] =  sinA[i];
        nz[i] = -cosA[i];
    }

    return { pts, N, xm, zm, len, sinA, cosA, nx, nz };
}

/** Linear interpolation: given x_arr (sorted ascending) and y_arr, find y at xq.
 *  xQuery=true: query by x-value. xQuery=false: query by x-value returning z. */
function _interp(psi_arr, zeta_arr, psiQ, returnX) {
    // psi_arr is 0..1 cosine-spaced. Map psiQ to index.
    const N = psi_arr.length - 1;
    // binary search
    let lo = 0, hi = N;
    while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (psi_arr[mid] <= psiQ) lo = mid; else hi = mid;
    }
    const t = (psiQ - psi_arr[lo]) / (psi_arr[hi] - psi_arr[lo] + 1e-30);
    if (returnX) return psi_arr[lo] + t * (psi_arr[hi] - psi_arr[lo]);
    return zeta_arr[lo] + t * (zeta_arr[hi] - zeta_arr[lo]);
}

/**
 * Hess-Smith source+vortex panel method.
 * All panels share a single unknown vortex strength gamma (Kutta condition).
 * Each panel has an unknown source strength sigma_i.
 *
 * System: A * [sigma_1..sigma_N, gamma]^T = RHS
 * Size: (N+1) × (N+1)
 */
function runPanelMethod(geom, alphaDeg) {
    const alpha = alphaDeg * Math.PI / 180;
    const { N, xm, zm, len, sinA, cosA, nx, nz } = geom;

    // ── Influence coefficient matrices ────────────────────────────────────────
    // For each collocation point i, and source panel j:
    //   normal velocity induced by unit source on panel j at midpoint i.
    // Analytical formulae from Katz & Plotkin §11.1
    const A  = new Float64Array((N+1) * (N+1));
    const RHS = new Float64Array(N+1);

    const idx = (r, c) => r * (N+1) + c;

    for (let i = 0; i < N; i++) {
        // Collect source and vortex normal influence from every panel j
        let sumVortNorm = 0; // accumulated vortex normal influence (gamma col)

        for (let j = 0; j < N; j++) {
            const { u_s, w_s, u_v, w_v } = _panelInfluence(
                xm[i], zm[i], geom.pts[j][0], geom.pts[j][1],
                geom.pts[j+1][0], geom.pts[j+1][1], sinA[j], cosA[j], len[j]
            );
            // Normal component of source influence → A[i,j]
            A[idx(i, j)] = u_s * nx[i] + w_s * nz[i];
            // Normal component of vortex influence (summed into last col)
            sumVortNorm += (u_v * nx[i] + w_v * nz[i]);
        }
        A[idx(i, N)] = sumVortNorm; // gamma column
        // RHS: enforce Vn = 0 (flow tangency) → Vn = -Vinf·n
        RHS[i] = -(Math.cos(alpha) * nx[i] + Math.sin(alpha) * nz[i]);
    }

    // Kutta condition: gamma_TE_upper + gamma_TE_lower = 0
    // Approximated as: tangential velocity on first panel + last panel = 0
    // which gives: sum of tangential vortex influences = -(sum of tangential source influences)
    // Simplified Kutta: vortex tangential at panel 0 + panel N-1 = −(source tangential sum)
    {
        const i0 = 0, iN = N - 1;
        let sourceT0 = 0, sourceT1 = 0, vortT0 = 0, vortT1 = 0;
        for (let j = 0; j < N; j++) {
            const { u_s, w_s, u_v, w_v } = _panelInfluence(
                xm[i0], zm[i0], geom.pts[j][0], geom.pts[j][1],
                geom.pts[j+1][0], geom.pts[j+1][1], sinA[j], cosA[j], len[j]
            );
            const t0x = cosA[i0], t0z = sinA[i0];
            sourceT0 += (u_s * t0x + w_s * t0z);
            vortT0   += (u_v * t0x + w_v * t0z);

            const { u_s: us1, w_s: ws1, u_v: uv1, w_v: wv1 } = _panelInfluence(
                xm[iN], zm[iN], geom.pts[j][0], geom.pts[j][1],
                geom.pts[j+1][0], geom.pts[j+1][1], sinA[j], cosA[j], len[j]
            );
            const t1x = cosA[iN], t1z = sinA[iN];
            sourceT1 += (us1 * t1x + ws1 * t1z);
            vortT1   += (uv1 * t1x + wv1 * t1z);
        }
        // Row N: tangential vel at panel 0 + tangential vel at panel N-1 = 0
        for (let j = 0; j < N; j++) {
            const { u_s: us0, w_s: ws0 } = _panelInfluence(
                xm[i0], zm[i0], geom.pts[j][0], geom.pts[j][1],
                geom.pts[j+1][0], geom.pts[j+1][1], sinA[j], cosA[j], len[j]
            );
            const { u_s: us1, w_s: ws1 } = _panelInfluence(
                xm[iN], zm[iN], geom.pts[j][0], geom.pts[j][1],
                geom.pts[j+1][0], geom.pts[j+1][1], sinA[j], cosA[j], len[j]
            );
            const t0x = cosA[i0], t0z = sinA[i0];
            const t1x = cosA[iN], t1z = sinA[iN];
            A[idx(N, j)] = (us0*t0x + ws0*t0z) + (us1*t1x + ws1*t1z);
        }
        A[idx(N, N)] = vortT0 + vortT1;
        RHS[N] = -(
            (Math.cos(alpha) * cosA[i0] + Math.sin(alpha) * sinA[i0]) +
            (Math.cos(alpha) * cosA[iN] + Math.sin(alpha) * sinA[iN])
        );
    }

    // ── Solve linear system with Gaussian elimination ─────────────────────────
    const sol = _gaussElim(A, RHS, N+1);
    const sigma = sol.slice(0, N);
    const gamma = sol[N];

    // ── Compute tangential velocity and Cp on each panel ─────────────────────
    const Cp = new Float64Array(N);
    const Vt = new Float64Array(N);

    for (let i = 0; i < N; i++) {
        let vt = Math.cos(alpha) * cosA[i] + Math.sin(alpha) * sinA[i]; // free-stream tangential
        for (let j = 0; j < N; j++) {
            const { u_s, w_s, u_v, w_v } = _panelInfluence(
                xm[i], zm[i], geom.pts[j][0], geom.pts[j][1],
                geom.pts[j+1][0], geom.pts[j+1][1], sinA[j], cosA[j], len[j]
            );
            const tx = cosA[i], tz = sinA[i];
            vt += sigma[j] * (u_s * tx + w_s * tz) + gamma * (u_v * tx + w_v * tz);
        }
        Vt[i] = vt;
        Cp[i] = 1 - vt * vt; // Cp = 1 - (V/Vinf)^2
    }

    // ── Integrate to get Cl and Cm_qc ────────────────────────────────────────
    // Cl = -∮ Cp (nx cosα + nz sinα) dS  (lift direction perpendicular to Vinf)
    // Cm_qc about x=0.25, positive nose-up
    let Cl = 0, Cm = 0;
    for (let i = 0; i < N; i++) {
        const dl = len[i];
        // Pressure force per unit span: dF = -Cp * n * dl
        const dFx = -Cp[i] * nx[i] * dl;
        const dFz = -Cp[i] * nz[i] * dl;
        // Lift (perpendicular to free-stream): L = Fz cosα - Fx sinα
        Cl += (dFz * Math.cos(alpha) - dFx * Math.sin(alpha));
        // Moment about quarter chord (nose-up positive)
        Cm += -dFz * (xm[i] - 0.25) + dFx * zm[i];
    }

    // ── Split Cp back into upper/lower surface ────────────────────────────────
    const Np2 = Math.floor(N / 2);
    // Upper panels: indices 0..Np2-1 (TE→LE direction in pts, so xm decreases)
    // Lower panels: indices Np2..N-1 (LE→TE direction, xm increases)
    const x_upper = [], Cp_upper = [];
    const x_lower = [], Cp_lower = [];

    for (let i = 0; i < Np2; i++) {
        x_upper.push(xm[i]);
        Cp_upper.push(Cp[i]);
    }
    for (let i = Np2; i < N; i++) {
        x_lower.push(xm[i]);
        Cp_lower.push(Cp[i]);
    }
    // Sort upper by x ascending
    const sortedU = x_upper.map((x, i) => [x, Cp_upper[i]]).sort((a, b) => a[0] - b[0]);
    const sortedL = x_lower.map((x, i) => [x, Cp_lower[i]]).sort((a, b) => a[0] - b[0]);

    return {
        Cl,
        Cm_qc: Cm,
        x_upper: sortedU.map(p => p[0]),
        Cp_upper: sortedU.map(p => p[1]),
        x_lower: sortedL.map(p => p[0]),
        Cp_lower: sortedL.map(p => p[1]),
    };
}

/**
 * Analytical influence coefficients for a constant-strength source+vortex panel.
 * Returns induced (u, w) at point (xp, zp) from:
 *   - unit source panel  → (u_s, w_s)
 *   - unit vortex panel  → (u_v, w_v)
 * Panel endpoints: (x1,z1)→(x2,z2), length l, orientation (sinA, cosA).
 * From Katz & Plotkin Eq. 11.1–11.12
 */
function _panelInfluence(xp, zp, x1, z1, x2, z2, sinA, cosA, l) {
    // Transform to panel-local coordinates
    const dxp = xp - x1, dzp = zp - z1;
    const xi  =  dxp * cosA + dzp * sinA; // tangential
    const eta = -dxp * sinA + dzp * cosA; // normal

    const r1sq = xi*xi + eta*eta;
    const r2sq = (xi-l)*(xi-l) + eta*eta;
    const r1   = Math.sqrt(r1sq);
    const r2   = Math.sqrt(r2sq);

    const eps = 1e-10;
    const lnr  = (r1sq > eps && r2sq > eps) ? 0.5 * Math.log(r2sq / r1sq) : 0;
    const theta1 = Math.atan2(eta, xi);
    const theta2 = Math.atan2(eta, xi - l);
    const dtheta = theta2 - theta1;

    const K  = 1 / (2 * Math.PI);

    // Source: u_xi = K*(ln r1 - ln r2) = K*(-lnr), u_eta = K*dtheta ... wait sign:
    // u_xi_s = K * ln(r1/r2) = -K * lnr   (since lnr = ln r2 - ln r1)
    // u_eta_s = K * (theta2 - theta1)
    const u_xi_s  = -K * lnr;
    const u_eta_s =  K * dtheta;

    // Vortex: u_xi_v = K*dtheta, u_eta_v = -(-K*lnr) = K*lnr  (90° rotation of source)
    const u_xi_v  =  K * dtheta;
    const u_eta_v =  K * lnr;

    // Rotate back to global
    const u_s =  u_xi_s * cosA - u_eta_s * sinA;
    const w_s =  u_xi_s * sinA + u_eta_s * cosA;
    const u_v =  u_xi_v * cosA - u_eta_v * sinA;
    const w_v =  u_xi_v * sinA + u_eta_v * cosA;

    return { u_s, w_s, u_v, w_v };
}

/**
 * In-place Gaussian elimination with partial pivoting.
 * A is a flat Float64Array of size n*n (row-major). b is Float64Array of size n.
 * Returns solution x as Float64Array.
 */
function _gaussElim(A, b, n) {
    const x = new Float64Array(b);
    const M = new Float64Array(A); // copy

    for (let col = 0; col < n; col++) {
        // Partial pivot
        let maxVal = Math.abs(M[col*n + col]), maxRow = col;
        for (let row = col+1; row < n; row++) {
            const v = Math.abs(M[row*n + col]);
            if (v > maxVal) { maxVal = v; maxRow = row; }
        }
        if (maxRow !== col) {
            for (let k = 0; k < n; k++) {
                const tmp = M[col*n+k]; M[col*n+k] = M[maxRow*n+k]; M[maxRow*n+k] = tmp;
            }
            const tmp = x[col]; x[col] = x[maxRow]; x[maxRow] = tmp;
        }
        // Eliminate
        const pivot = M[col*n + col];
        if (Math.abs(pivot) < 1e-14) continue;
        for (let row = col+1; row < n; row++) {
            const fac = M[row*n + col] / pivot;
            for (let k = col; k < n; k++) M[row*n+k] -= fac * M[col*n+k];
            x[row] -= fac * x[col];
        }
    }
    // Back substitution
    for (let row = n-1; row >= 0; row--) {
        let s = x[row];
        for (let k = row+1; k < n; k++) s -= M[row*n+k] * x[k];
        x[row] = s / M[row*n + row];
    }
    return x;
}

/**
 * High-level entry point called from ui.js.
 * @param {Object} geom  - output of computeGeometry()
 * @param {number} alpha - angle of attack in degrees
 * @param {number} N_panels - number of panels (default 120)
 */
function runSolver(geom, alpha, N_panels = 120) {
    const panels = buildPanels(geom.psi, geom.zeta_U, geom.zeta_L, N_panels);
    return runPanelMethod(panels, alpha);
}
