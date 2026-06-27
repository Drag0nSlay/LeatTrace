import React, { useEffect, useRef, useState } from 'react';

export default function GraphVisualizer({ graph, rootAddress }) {
  const canvasRef = useRef(null);
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedLink, setSelectedLink] = useState(null);

  const stateRef = useRef({
    nodes: [],
    links: [],
    draggedNodeId: null,
    isPanning: false,
    panStart: { x: 0, y: 0 },
    mousePos: { x: 0, y: 0 },
    width: 800,
    height: 550,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.parentElement.getBoundingClientRect();
    const w = rect.width || 800;
    const h = rect.height || 550;
    
    canvas.width = w;
    canvas.height = h;
    stateRef.current.width = w;
    stateRef.current.height = h;

    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
    setSelectedLink(null);

    const rawNodes = graph?.nodes || [];
    const rawLinks = graph?.links || [];

    const mappedNodes = rawNodes.map((n, idx) => {
      const angle = (idx / rawNodes.length) * Math.PI * 2;
      const radius = Math.min(w, h) * 0.3;
      const isRoot = n.id === rootAddress;
      return {
        ...n,
        x: isRoot ? w / 2 : w / 2 + Math.cos(angle) * radius,
        y: isRoot ? h / 2 : h / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        radius: isRoot ? 24 : 18,
        isRoot
      };
    });

    const mappedLinks = rawLinks.map(l => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      return {
        ...l,
        sourceId,
        targetId,
        particleOffset: Math.random()
      };
    });

    stateRef.current.nodes = mappedNodes;
    stateRef.current.links = mappedLinks;

  }, [graph, rootAddress]);

  useEffect(() => {
    let animFrameId;
    
    const updatePhysicsAndDraw = () => {
      const state = stateRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { nodes, links, width, height, draggedNodeId } = state;

      // Physics
      const k = 140;
      const gravity = 0.03;
      const friction = 0.75;

      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 300) {
            const force = (5000 / (dist * dist));
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            if (n1.id !== draggedNodeId) { n1.vx -= fx; n1.vy -= fy; }
            if (n2.id !== draggedNodeId) { n2.vx += fx; n2.vy += fy; }
          }
        }
      }

      links.forEach(l => {
        const sourceNode = nodes.find(n => n.id === l.sourceId);
        const targetNode = nodes.find(n => n.id === l.targetId);
        if (!sourceNode || !targetNode) return;
        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - k) * 0.04;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (sourceNode.id !== draggedNodeId) { sourceNode.vx += fx; sourceNode.vy += fy; }
        if (targetNode.id !== draggedNodeId) { targetNode.vx -= fx; targetNode.vy -= fy; }
      });

      nodes.forEach(n => {
        if (n.id === draggedNodeId) return;
        const dx = (width / 2) - n.x;
        const dy = (height / 2) - n.y;
        n.vx += dx * gravity;
        n.vy += dy * gravity;
        n.x += n.vx;
        n.y += n.vy;
        n.vx *= friction;
        n.vy *= friction;
        n.x = Math.max(50, Math.min(width - 50, n.x));
        n.y = Math.max(50, Math.min(height - 50, n.y));
      });

      // Draw
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // ── Links ──────────────────────────────────────────────────────────────
      links.forEach(l => {
        const sourceNode = nodes.find(n => n.id === l.sourceId);
        const targetNode = nodes.find(n => n.id === l.targetId);
        if (!sourceNode || !targetNode) return;

        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        
        const isSelected = selectedLink && selectedLink.txid === l.txid;
        ctx.strokeStyle = isSelected ? '#00f2fe' : l.isChange ? 'rgba(148,163,184,0.25)' : 'rgba(255,255,255,0.15)';
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.setLineDash(l.isChange ? [4, 4] : []);
        ctx.stroke();
        ctx.setLineDash([]);

        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const angle = Math.atan2(dy, dx);
        const arrowSize = 6;
        const arrowX = targetNode.x - Math.cos(angle) * targetNode.radius;
        const arrowY = targetNode.y - Math.sin(angle) * targetNode.radius;

        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX - arrowSize * Math.cos(angle - Math.PI / 6), arrowY - arrowSize * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(arrowX - arrowSize * Math.cos(angle + Math.PI / 6), arrowY - arrowSize * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = isSelected ? '#00f2fe' : 'rgba(255,255,255,0.3)';
        ctx.fill();

        // Animated particles
        const particleTime = ((Date.now() / 2500) + l.particleOffset) % 1;
        const px = sourceNode.x + dx * particleTime;
        const py = sourceNode.y + dy * particleTime;
        const pColor = (targetNode.riskScore >= 75) ? '#ef4444'
                     : (targetNode.riskScore >= 40) ? '#f59e0b'
                     : '#00f2fe';
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = pColor;
        ctx.shadowColor = pColor;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Amount label
        const midX = (sourceNode.x + targetNode.x) / 2;
        const midY = (sourceNode.y + targetNode.y) / 2;
        ctx.save();
        ctx.translate(midX, midY);
        ctx.rotate(angle);
        ctx.font = '500 9px monospace';
        const amountStr = `${l.value}`;
        const textWidth = ctx.measureText(amountStr).width;
        ctx.fillStyle = 'rgba(10,15,30,0.85)';
        ctx.fillRect(-textWidth/2 - 2, -12, textWidth + 4, 11);
        ctx.fillStyle = isSelected ? '#ffffff' : '#94a3b8';  // ← WHITE when selected, light grey otherwise
        ctx.fillText(amountStr, -textWidth/2, -3);
        ctx.restore();
      });

      // ── Nodes ──────────────────────────────────────────────────────────────
      nodes.forEach(n => {
        const isSelected = selectedNode && selectedNode.id === n.id;

        // Risk color — using real hex, not CSS vars (canvas can't read CSS vars)
        const riskColor = (n.riskScore >= 75) ? '#ef4444'
                        : (n.riskScore >= 40) ? '#f59e0b'
                        : '#10b981';

        // Aura ring
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = riskColor;
        ctx.lineWidth = isSelected ? 3 : n.isRoot ? 2.5 : 1;
        ctx.globalAlpha = isSelected ? 0.8 : n.isRoot ? 0.6 : 0.25;
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Node fill gradient
        const gradient = ctx.createRadialGradient(n.x, n.y, 1, n.x, n.y, n.radius);
        gradient.addColorStop(0, 'rgba(30,41,79,1)');
        gradient.addColorStop(1, '#060913');
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#00f2fe' : 'rgba(255,255,255,0.2)';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();

        // Type initials inside node
        ctx.font = '800 10px sans-serif';
        ctx.fillStyle = riskColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const typeInitial = (n.type || 'UK').slice(0, 2).toUpperCase();
        ctx.fillText(typeInitial, n.x, n.y);

        // ── ADDRESS LABELS — WHITE TEXT ──────────────────────────────────────
        ctx.font = '600 10px sans-serif';
        ctx.fillStyle = '#ffffff';                    // ← WHITE (was var(--text-main))
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.label, n.x, n.y + n.radius + 14);

        ctx.font = '400 9px monospace';
        ctx.fillStyle = '#cbd5e1';                    // ← LIGHT GREY (was var(--text-muted))
        const abbrevAddr = n.id ? `${n.id.slice(0, 6)}...${n.id.slice(-4)}` : '';
        ctx.fillText(abbrevAddr, n.x, n.y + n.radius + 25);

        // OFAC / high risk tag
        if (n.riskScore >= 90 || n.tag) {
          ctx.font = '700 8px sans-serif';
          ctx.fillStyle = '#ef4444';
          ctx.fillText(n.tag ? `⚠ ${n.tag.slice(0,12)}` : '🔴 SANCTIONED', n.x, n.y - n.radius - 10);
        }
      });

      ctx.restore();
      animFrameId = requestAnimationFrame(updatePhysicsAndDraw);
    };

    updatePhysicsAndDraw();
    return () => cancelAnimationFrame(animFrameId);

  }, [zoom, pan, selectedNode, selectedLink]);

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const targetX = (x - pan.x) / zoom;
    const targetY = (y - pan.y) / zoom;
    const state = stateRef.current;
    state.mousePos = { x, y };

    const clickedNode = state.nodes.find(n => {
      const dx = n.x - targetX;
      const dy = n.y - targetY;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 6;
    });

    if (clickedNode) {
      state.draggedNodeId = clickedNode.id;
      setSelectedNode(clickedNode);
      setSelectedLink(null);
    } else {
      const clickedLink = state.links.find(l => {
        const s = state.nodes.find(n => n.id === l.sourceId);
        const t = state.nodes.find(n => n.id === l.targetId);
        if (!s || !t) return false;
        const A = targetX - s.x, B = targetY - s.y;
        const C = t.x - s.x,    D = t.y - s.y;
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = lenSq !== 0 ? dot / lenSq : -1;
        let xx = param < 0 ? s.x : param > 1 ? t.x : s.x + param * C;
        let yy = param < 0 ? s.y : param > 1 ? t.y : s.y + param * D;
        return Math.sqrt((targetX - xx) ** 2 + (targetY - yy) ** 2) < 8;
      });

      if (clickedLink) {
        setSelectedLink(clickedLink);
        setSelectedNode(null);
      } else {
        state.isPanning = true;
        state.panStart = { x: x - pan.x, y: y - pan.y };
      }
    }
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const state = stateRef.current;
    if (state.draggedNodeId) {
      const targetNode = state.nodes.find(n => n.id === state.draggedNodeId);
      if (targetNode) {
        targetNode.x = (x - pan.x) / zoom;
        targetNode.y = (y - pan.y) / zoom;
      }
    } else if (state.isPanning) {
      setPan({ x: x - state.panStart.x, y: y - state.panStart.y });
    }
  };

  const handleMouseUp = () => {
    stateRef.current.draggedNodeId = null;
    stateRef.current.isPanning = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.4, Math.min(2.5, prev * (e.deltaY < 0 ? 1.05 : 0.95))));
  };

  const resetViewport = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
    setSelectedLink(null);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ display: 'block', background: 'transparent' }}
      />

      <div className="graph-toolbar">
        <button className="tool-btn" onClick={() => setZoom(z => Math.min(2.5, z * 1.1))}>➕</button>
        <button className="tool-btn" onClick={() => setZoom(z => Math.max(0.4, z * 0.9))}>➖</button>
        <button className="tool-btn" onClick={resetViewport}>🔄</button>
      </div>

      {selectedNode && (
        <div style={{
          position: 'absolute', top: '1rem', right: '1rem',
          background: 'rgba(13,20,38,0.95)',
          border: `1px solid ${selectedNode.riskScore >= 75 ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
          padding: '0.75rem 1rem', borderRadius: '8px', maxWidth: '240px',
          zIndex: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#ffffff' }}>👤 Entity Node Info</h4>
          <p style={{ fontWeight: 700, margin: '0.2rem 0', fontSize: '0.9rem', color: '#00f2fe' }}>{selectedNode.label}</p>
          <div style={{ display: 'flex', gap: '0.5rem', margin: '0.25rem 0' }}>
            <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem', borderRadius: '3px', fontWeight: 700, background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}>
              {selectedNode.type}
            </span>
            <span style={{
              fontSize: '0.7rem', padding: '0.1rem 0.35rem', borderRadius: '3px', fontWeight: 700,
              background: selectedNode.riskScore >= 75 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
              color: selectedNode.riskScore >= 75 ? '#ef4444' : '#10b981',
            }}>
              Risk: {selectedNode.riskScore}%
            </span>
          </div>
          <code style={{ fontSize: '0.7rem', wordBreak: 'break-all', display: 'block', color: '#94a3b8', fontFamily: 'monospace' }}>
            {selectedNode.id}
          </code>
        </div>
      )}

      {selectedLink && (
        <div style={{
          position: 'absolute', top: '1rem', right: '1rem',
          background: 'rgba(13,20,38,0.95)', border: '1px solid #00f2fe',
          padding: '0.75rem 1rem', borderRadius: '8px', maxWidth: '240px',
          zIndex: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#ffffff' }}>🔗 Transaction Info</h4>
          <p style={{ fontWeight: 700, margin: '0.2rem 0', fontSize: '0.95rem', color: '#ffffff' }}>
            {selectedLink.value}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.2rem 0' }}>
            {selectedLink.timestamp ? new Date(selectedLink.timestamp).toLocaleTimeString() : 'N/A'}
          </p>
          <code style={{ fontSize: '0.7rem', wordBreak: 'break-all', display: 'block', color: '#94a3b8', fontFamily: 'monospace' }}>
            Tx: {selectedLink.txid || 'N/A'}
          </code>
        </div>
      )}

      <div className="legend-panel">
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#10b981' }}></div>
          <span>Low Risk (&lt;40%)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#f59e0b' }}></div>
          <span>Medium Risk (40-75%)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#ef4444' }}></div>
          <span>High Risk / Sanctioned (&gt;75%)</span>
        </div>
      </div>
    </div>
  );
}