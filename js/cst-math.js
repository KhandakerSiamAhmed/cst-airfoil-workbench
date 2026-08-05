function binomialCoeff(n, k) {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    let res = 1;
    for (let i = 1; i <= k; i++) {
        res = res * (n - i + 1) / i;
    }
    return Math.round(res);
}

function computeBernsteinBasis(psi, i, n) {
    const K = binomialCoeff(n, i);
    return K * Math.pow(psi, i) * Math.pow(1 - psi, n - i);
}

function computeClassFunction(psi, N1, N2) {
    return Math.pow(psi, N1) * Math.pow(1 - psi, N2);
}

function computeShapeFunction(psi, weights, n) {
    let S = 0;
    for (let i = 0; i <= n; i++) {
        S += weights[i] * computeBernsteinBasis(psi, i, n);
    }
    return S;
}

function computeClassFunctionDerivative(psi, N1, N2) {
    let term1 = (psi === 0 && N1 === 0) ? 0 : (psi === 0 && N1 < 1) ? Infinity : N1 * Math.pow(psi, N1 - 1) * Math.pow(1 - psi, N2);
    let term2 = (psi === 1 && N2 === 0) ? 0 : (psi === 1 && N2 < 1) ? Infinity : N2 * Math.pow(psi, N1) * Math.pow(1 - psi, N2 - 1);
    return term1 - term2;
}

function computeShapeFunctionDerivative(psi, weights, n) {
    let dS = 0;
    for (let i = 0; i <= n; i++) {
        const K = binomialCoeff(n, i);
        let term1 = 0;
        if (i > 0) {
            term1 = i * Math.pow(psi, i - 1) * Math.pow(1 - psi, n - i);
        }
        let term2 = 0;
        if (n - i > 0) {
            term2 = (n - i) * Math.pow(psi, i) * Math.pow(1 - psi, n - i - 1);
        }
        dS += weights[i] * K * (term1 - term2);
    }
    return dS;
}

function evaluateCST(psi_arr, N1, N2, weights, dzTE_c, n) {
    let zeta = new Array(psi_arr.length);
    for (let i = 0; i < psi_arr.length; i++) {
        let psi = psi_arr[i];
        let C = computeClassFunction(psi, N1, N2);
        let S = computeShapeFunction(psi, weights, n);
        zeta[i] = C * S + psi * dzTE_c;
    }
    return zeta;
}

function computeGeometry(n, N1, N2, Au, Al, dzTE_U, dzTE_L, N_points = 200) {
    let psi_arr = new Float64Array(N_points + 1);
    for (let i = 0; i <= N_points; i++) {
        psi_arr[i] = 0.5 * (1 - Math.cos(Math.PI * i / N_points));
    }

    let zeta_U = evaluateCST(psi_arr, N1, N2, Au, dzTE_U, n);
    let zeta_L = evaluateCST(psi_arr, N1, N2, Al, dzTE_L, n);

    let R_LE_U = (Au[0] * Au[0] / 2);
    let R_LE_L = (Al[0] * Al[0] / 2);

    let max_t = 0, max_t_x = 0;
    let max_h = 0, max_h_x = 0;
    let camber = new Float64Array(psi_arr.length);
    let thickness = new Float64Array(psi_arr.length);
    
    for (let i = 0; i <= N_points; i++) {
        thickness[i] = zeta_U[i] - zeta_L[i];
        camber[i] = (zeta_U[i] + zeta_L[i]) / 2;
        if (thickness[i] > max_t) { max_t = thickness[i]; max_t_x = psi_arr[i]; }
        if (Math.abs(camber[i]) > Math.abs(max_h)) { max_h = camber[i]; max_h_x = psi_arr[i]; }
    }

    const eps = 1e-6;
    const psi_te = 1 - eps;
    
    let C_te = computeClassFunction(psi_te, N1, N2);
    let C_prime_te = computeClassFunctionDerivative(psi_te, N1, N2);
    
    let S_U_te = computeShapeFunction(psi_te, Au, n);
    let S_U_prime_te = computeShapeFunctionDerivative(psi_te, Au, n);
    let dZeta_U_te = C_prime_te * S_U_te + C_te * S_U_prime_te + dzTE_U;
    
    let S_L_te = computeShapeFunction(psi_te, Al, n);
    let S_L_prime_te = computeShapeFunctionDerivative(psi_te, Al, n);
    let dZeta_L_te = C_prime_te * S_L_te + C_te * S_L_prime_te + dzTE_L;

    let beta_U = Math.atan(dZeta_U_te) * (180 / Math.PI);
    let beta_L = Math.atan(dZeta_L_te) * (180 / Math.PI);

    let dZdx_U = new Float64Array(psi_arr.length);
    let dZdx_L = new Float64Array(psi_arr.length);
    let d2Zdx2_U = new Float64Array(psi_arr.length);
    let d2Zdx2_L = new Float64Array(psi_arr.length);
    let kappa_U = new Float64Array(psi_arr.length);
    let kappa_L = new Float64Array(psi_arr.length);

    for (let i = 0; i <= N_points; i++) {
        if (i === 0) {
            dZdx_U[i] = (zeta_U[1] - zeta_U[0]) / (psi_arr[1] - psi_arr[0]);
            dZdx_L[i] = (zeta_L[1] - zeta_L[0]) / (psi_arr[1] - psi_arr[0]);
        } else if (i === N_points) {
            dZdx_U[i] = (zeta_U[N_points] - zeta_U[N_points-1]) / (psi_arr[N_points] - psi_arr[N_points-1]);
            dZdx_L[i] = (zeta_L[N_points] - zeta_L[N_points-1]) / (psi_arr[N_points] - psi_arr[N_points-1]);
        } else {
            dZdx_U[i] = (zeta_U[i+1] - zeta_U[i-1]) / (psi_arr[i+1] - psi_arr[i-1]);
            dZdx_L[i] = (zeta_L[i+1] - zeta_L[i-1]) / (psi_arr[i+1] - psi_arr[i-1]);
        }
    }

    for (let i = 0; i <= N_points; i++) {
        if (i === 0) {
            d2Zdx2_U[i] = (dZdx_U[1] - dZdx_U[0]) / (psi_arr[1] - psi_arr[0]);
            d2Zdx2_L[i] = (dZdx_L[1] - dZdx_L[0]) / (psi_arr[1] - psi_arr[0]);
        } else if (i === N_points) {
            d2Zdx2_U[i] = (dZdx_U[N_points] - dZdx_U[N_points-1]) / (psi_arr[N_points] - psi_arr[N_points-1]);
            d2Zdx2_L[i] = (dZdx_L[N_points] - dZdx_L[N_points-1]) / (psi_arr[N_points] - psi_arr[N_points-1]);
        } else {
            d2Zdx2_U[i] = (dZdx_U[i+1] - dZdx_U[i-1]) / (psi_arr[i+1] - psi_arr[i-1]);
            d2Zdx2_L[i] = (dZdx_L[i+1] - dZdx_L[i-1]) / (psi_arr[i+1] - psi_arr[i-1]);
        }
        
        kappa_U[i] = Math.abs(d2Zdx2_U[i]) / Math.pow(1 + dZdx_U[i]*dZdx_U[i], 1.5);
        kappa_L[i] = Math.abs(d2Zdx2_L[i]) / Math.pow(1 + dZdx_L[i]*dZdx_L[i], 1.5);
    }

    return {
        psi: Array.from(psi_arr),
        zeta_U: Array.from(zeta_U),
        zeta_L: Array.from(zeta_L),
        camber: Array.from(camber),
        thickness: Array.from(thickness),
        dZdx_U: Array.from(dZdx_U),
        dZdx_L: Array.from(dZdx_L),
        d2Zdx2_U: Array.from(d2Zdx2_U),
        d2Zdx2_L: Array.from(d2Zdx2_L),
        kappa_U: Array.from(kappa_U),
        kappa_L: Array.from(kappa_L),
        max_t, max_t_x,
        max_h, max_h_x,
        R_LE_U, R_LE_L,
        beta_U, beta_L
    };
}
