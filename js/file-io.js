function parseCoordinateFile(content) {
    let lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let startIdx = 0;
    if (lines[0] && isNaN(parseFloat(lines[0].split(/\s+/)[0]))) {
        startIdx = 1;
    }
    
    let parts = lines[startIdx].split(/\s+/);
    let isLednicer = parts.length === 2 && !lines[startIdx].includes('.');
    
    let pts = [];
    for (let i = startIdx + (isLednicer ? 1 : 0); i < lines.length; i++) {
        let coords = lines[i].split(/\s+/);
        if (coords.length >= 2) {
            let x = parseFloat(coords[0]);
            let z = parseFloat(coords[1]);
            if (!isNaN(x) && !isNaN(z)) {
                pts.push({x, z});
            }
        }
    }
    
    let minX = Math.min(...pts.map(p => p.x));
    let maxX = Math.max(...pts.map(p => p.x));
    let chord = maxX - minX;
    
    if (chord > 0 && Math.abs(chord - 1.0) > 1e-4) {
        pts = pts.map(p => ({ x: (p.x - minX) / chord, z: p.z / chord }));
    }
    
    let upper = [];
    let lower = [];
    
    if (isLednicer) {
        let n_upper = parseInt(parts[0]);
        upper = pts.slice(0, n_upper);
        lower = pts.slice(n_upper);
    } else {
        let le_idx = 0;
        let min_x_val = Infinity;
        for (let i = 0; i < pts.length; i++) {
            if (pts[i].x < min_x_val) {
                min_x_val = pts[i].x;
                le_idx = i;
            }
        }
        
        for (let i = le_idx; i >= 0; i--) {
            upper.push(pts[i]);
        }
        
        for (let i = le_idx; i < pts.length; i++) {
            lower.push(pts[i]);
        }
    }
    
    return { upper, lower, raw: pts };
}

function exportDAT(psi, zeta_U, zeta_L) {
    let out = "CST Airfoil\n";
    for (let i = psi.length - 1; i >= 0; i--) {
        out += `${psi[i].toFixed(6)}  ${zeta_U[i].toFixed(6)}\n`;
    }
    for (let i = 1; i < psi.length; i++) {
        out += `${psi[i].toFixed(6)}  ${zeta_L[i].toFixed(6)}\n`;
    }
    return out;
}

function exportCSV(psi, zeta_U, zeta_L) {
    let out = "x/c,z/c_upper,z/c_lower\n";
    for (let i = 0; i < psi.length; i++) {
        out += `${psi[i].toFixed(6)},${zeta_U[i].toFixed(6)},${zeta_L[i].toFixed(6)}\n`;
    }
    return out;
}

function exportDXF(psi, zeta_U, zeta_L) {
    let pts = [];
    for (let i = psi.length - 1; i >= 0; i--) {
        pts.push({x: psi[i], y: zeta_U[i]});
    }
    for (let i = 1; i < psi.length; i++) {
        pts.push({x: psi[i], y: zeta_L[i]});
    }
    
    // 70=1 → closed polyline so SolidWorks treats it as a closed sketch profile
    let dxf = `  0\nSECTION\n  2\nENTITIES\n  0\nLWPOLYLINE\n  8\n0\n 90\n${pts.length}\n 70\n1\n`;
    for (let p of pts) {
        dxf += ` 10\n${p.x.toFixed(6)}\n 20\n${p.y.toFixed(6)}\n`;
    }
    dxf += `  0\nENDSEC\n  0\nEOF\n`;
    return dxf;
}

// SolidWorks Curve Through XYZ Points format (.sldcrv)
// Workflow in SolidWorks:
//   Insert > Curve > Curve Through XYZ Points > select this file
//   The curve appears as a closed spline feature.
//   To extrude: create a sketch on the desired plane,
//   use Convert Entities to project the curve into the sketch, then extrude.
function exportSLDCRV(psi, zeta_U, zeta_L) {
    // Build closed loop: TE -> upper surface -> LE -> lower surface -> TE
    let out = '';
    for (let i = psi.length - 1; i >= 0; i--) {
        out += `${psi[i].toFixed(6)}\t${zeta_U[i].toFixed(6)}\t0.000000\n`;
    }
    // Skip LE (already written) and walk back to TE along lower surface
    for (let i = 1; i < psi.length; i++) {
        out += `${psi[i].toFixed(6)}\t${zeta_L[i].toFixed(6)}\t0.000000\n`;
    }
    return out;
}

function downloadFile(filename, content) {
    let blob = new Blob([content], { type: 'text/plain' });
    let url = window.URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}
