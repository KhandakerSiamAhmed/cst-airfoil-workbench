
function transpose(M) {
    return M[0].map((_, colIndex) => M.map(row => row[colIndex]));
}

function multiply(A, B) {
    let result = new Array(A.length).fill(0).map(() => new Array(B[0].length).fill(0));
    for (let r = 0; r < A.length; r++) {
        for (let c = 0; c < B[0].length; c++) {
            for (let i = 0; i < A[0].length; i++) {
                result[r][c] += A[r][i] * B[i][c];
            }
        }
    }
    return result;
}

function invert(M) {
    let n = M.length;
    let I = [];
    let A = [];
    for(let i=0; i<n; i++) {
        I[i] = new Array(n).fill(0);
        I[i][i] = 1;
        A[i] = [...M[i]];
    }
    
    for(let i=0; i<n; i++) {
        let diag = A[i][i];
        if (Math.abs(diag) < 1e-12) {
            let swapRow = -1;
            for(let j=i+1; j<n; j++) {
                if(Math.abs(A[j][i]) > 1e-12) {
                    swapRow = j;
                    break;
                }
            }
            if (swapRow === -1) throw new Error("Singular matrix");
            let tempA = A[i]; A[i] = A[swapRow]; A[swapRow] = tempA;
            let tempI = I[i]; I[i] = I[swapRow]; I[swapRow] = tempI;
            diag = A[i][i];
        }
        for(let j=0; j<n; j++) {
            A[i][j] /= diag;
            I[i][j] /= diag;
        }
        for(let k=0; k<n; k++) {
            if (k === i) continue;
            let factor = A[k][i];
            for(let j=0; j<n; j++) {
                A[k][j] -= factor * A[i][j];
                I[k][j] -= factor * I[i][j];
            }
        }
    }
    return I;
}

function fitCST(pts, N1, N2, n) {
    let validPts = pts.filter(p => p.x > 1e-6 && p.x < 1 - 1e-6);
    
    if (n >= validPts.length) {
        throw new Error(`Insufficient points for fit. Order n=${n} requires at least ${n+1} valid points.`);
    }

    let M = [];
    let b = [];
    
    for (let p of validPts) {
        let psi = p.x;
        let C = computeClassFunction(psi, N1, N2);
        let b_val = p.z / C;
        b.push([b_val]);
        
        let row = [];
        for (let i = 0; i <= n; i++) {
            row.push(computeBernsteinBasis(psi, i, n));
        }
        M.push(row);
    }
    
    let Mt = transpose(M);
    let MtM = multiply(Mt, M);
    let invMtM;
    try {
        invMtM = invert(MtM);
    } catch (e) {
        throw new Error("Matrix inversion failed during least squares fit (singular matrix).");
    }
    
    let Mt_b = multiply(Mt, b);
    let A = multiply(invMtM, Mt_b);
    
    return A.map(row => row[0]);
}
