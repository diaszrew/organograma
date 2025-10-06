<script>
  /*******************************
    THEMES
  *******************************/
  const THEME_LIGHT = {
    pageBg: "#f3f4f6", pageText: "#1a1a1a",
    headerOverlayStart: "rgba(0,119,200,0.9)", headerOverlayEnd: "rgba(0,174,239,0.9)", headerText: "#ffffff",
    nodeBg: "#ffffff", nodeManagerBg: "#e3f2fd", boxStroke: "#3182bd", nameColor: "#003B73", titleColor: "#0077C8", secondaryText: "#888",
    linkStroke: "#999", containerBorder: "#ccc", containerBg: "#ffffff", highlight: "#f59e42",
    dropdownBg: "#ffffff", dropdownBorder: "#d1d5db", autocompleteHover: "#e0e7ff",
    filtersBg: "#ffffff", filtersText: "#1a1a1a", inputBg: "#ffffff", inputBorder: "#d1d5db", inputText: "#1a1a1a",
    btnBg: "#2563eb", btnBgHover: "#1d4ed8", btnText: "#ffffff",
    modalBg: "#ffffff", modalText: "#1a1a1a",
    spinnerTop: "#ffffff", cropBorder: "#00AEEF", cropBg: "rgba(0,174,239,0.15)"
  };
  const THEME_NIGHT = {
    pageBg: "#071025", pageText: "#e6eef8",
    headerOverlayStart: "rgba(2,6,23,0.85)", headerOverlayEnd: "rgba(7,18,34,0.85)", headerText: "#e6eef8",
    nodeBg: "#0f1724", nodeManagerBg: "#1f2937", boxStroke: "#4A90E2", nameColor: "#e6eef8", titleColor: "#90CAF9", secondaryText: "#9aa6b2",
    linkStroke: "#556677", containerBorder: "#2d3748", containerBg: "#071025", highlight: "#ffb86b",
    dropdownBg: "#0b1220", dropdownBorder: "#334155", autocompleteHover: "#12303f",
    filtersBg: "#071025", filtersText: "#e6eef8", inputBg: "#0b1220", inputBorder: "#334155", inputText: "#e6eef8",
    btnBg: "#2563eb", btnBgHover: "#1d4ed8", btnText: "#ffffff",
    modalBg: "#0b1220", modalText: "#e6eef8",
    spinnerTop: "#ffffff", cropBorder: "#00AEEF", cropBg: "rgba(0,174,239,0.12)"
  };

  /*******************************
    layout constants & state
  *******************************/
  let BOX_W = 220, BOX_H = 80, GROUP_OFFSET = 40, ZOOM_MIN = 0.4, ZOOM_MAX = 2;
  let NODE_H_SPACING = BOX_W * 1.4;
  let NODE_V_SPACING = BOX_H * 2.2;

  let colaboradores = [], departamentos = [];
  let currentSVG = null, globalZoom = null;
  let capturedCanvas = null;
  const SPINNER_ID = "processingOverlay";
  let currentTheme = THEME_LIGHT;
  let lastHierarchy = null;
  const hierarchyCache = new Map();

  /*******************************
    Responsive Dimensions
  *******************************/
  function getResponsiveDimensions() {
    const isMobile = window.innerWidth <= 768;
    const isTablet = window.innerWidth <= 1024;
    
    const dimensions = {
      boxWidth: isMobile ? 160 : isTablet ? 180 : 220,
      boxHeight: isMobile ? 60 : isTablet ? 70 : 80,
      nodeHSpacing: isMobile ? 120 : isTablet ? 150 : 220,
      nodeVSpacing: isMobile ? 90 : isTablet ? 100 : 120,
      fontSize: {
        name: isMobile ? '11px' : isTablet ? '12px' : '13px',
        title: isMobile ? '9px' : isTablet ? '10px' : '11px',
        dep: isMobile ? '8px' : isTablet ? '9px' : '10px'
      }
    };
    
    // Update global constants
    BOX_W = dimensions.boxWidth;
    BOX_H = dimensions.boxHeight;
    NODE_H_SPACING = dimensions.nodeHSpacing;
    NODE_V_SPACING = dimensions.nodeVSpacing;
    
    return dimensions;
  }

  /*******************************
    Debounce utility
  *******************************/
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /*******************************
    apply theme - CORRIGIDO
  *******************************/
  function applyThemeVars(theme) {
    const r = document.documentElement.style;
    
    // Aplicar todas as variáveis CSS
    Object.keys(theme).forEach(key => {
      const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      r.setProperty(`--${cssVar}`, theme[key]);
    });

    // Aplicar estilos específicos
    document.body.style.background = theme.pageBg;
    document.body.style.color = theme.pageText;

    const header = document.querySelector('.hero-bg');
    if (header) {
      header.style.background = `linear-gradient(135deg, ${theme.headerOverlayStart}, ${theme.headerOverlayEnd}), url('background.webp')`;
      header.style.color = theme.headerText;
    }

    // Atualizar cores dos elementos de texto no header
    const headerTexts = document.querySelectorAll('.hero-bg h1, .hero-bg p, .theme-switch .label');
    headerTexts.forEach(el => {
      el.style.color = theme.headerText;
    });

    const filters = document.getElementById('filtersPanel');
    if (filters) { 
      filters.style.background = theme.filtersBg; 
      filters.style.color = theme.filtersText; 
    }

    // Atualizar inputs e selects
    document.querySelectorAll('input[type="text"], select').forEach(el => {
      el.style.background = theme.inputBg;
      el.style.color = theme.inputText;
      el.style.borderColor = theme.inputBorder;
    });

    // Atualizar dropdown da câmera
    const cameraDropdown = document.getElementById('cameraDropdown');
    if (cameraDropdown) {
      cameraDropdown.style.background = theme.dropdownBg;
      cameraDropdown.style.borderColor = theme.dropdownBorder;
      cameraDropdown.style.color = theme.modalText;
    }

    // Atualizar modal de exportação
    const exportModal = document.getElementById('exportModal');
    if (exportModal) {
      const modalContent = exportModal.querySelector('div');
      if (modalContent) {
        modalContent.style.background = theme.modalBg;
        modalContent.style.color = theme.modalText;
      }
    }

    // Atualizar estado do toggle
    const toggleSwitch = document.getElementById('toggleThemeSwitch');
    if (toggleSwitch) {
      toggleSwitch.checked = (theme === THEME_NIGHT);
    }

    console.log('Tema aplicado:', theme === THEME_LIGHT ? 'Light' : 'Night');
  }

  // Aplicar tema inicial
  applyThemeVars(currentTheme);

  /*******************************
    helpers & lazy loaders
  *******************************/
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script'); s.src = src;
      s.onload = () => resolve(); s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }
  async function ensureHtml2Canvas(){ if (window.html2canvasLoaded) return; await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'); window.html2canvasLoaded = true; }
  async function ensureJsPDF(){ if (window.jspdfLoaded) return; await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'); window.jspdfLoaded = true; }

  function normalize(str){ return (str||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(); }

  /*******************************
    Data fetch & autocompletes
  *******************************/
  async function getColaboradores() {
    try {
      showSpinner("Carregando dados...");
      const url = "https://raw.githubusercontent.com/diaszrew/organograma/main/colaboradores.json";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
      colaboradores = await res.json();
      departamentos = [...new Set(colaboradores.map(c => c.departamento).filter(Boolean))].sort();
      setupAutocompleteDepartamentos();
      setupAutocompleteColaboradores();
      // initial render: collapsed by default, presidents open (inside buildHierarchy)
      renderizar("TODOS");
      hideSpinner();
      
      // Set footer year
      try {
        const yEl = document.getElementById('year');
        if (yEl) yEl.textContent = new Date().getFullYear();
      } catch (e) {
        console.warn('Could not set footer year:', e);
      }
    } catch (err) {
      console.error("Erro ao carregar colaboradores:", err);
      hideSpinner();
      document.querySelector("#chart").innerHTML =
        "<div style='padding:40px;color:#333'>Erro ao carregar dados. Verifique o console para detalhes.</div>";
    }
  }

  function setupAutocompleteDepartamentos() {
    const input = document.getElementById("departamento");
    const list = document.getElementById("departamento-list");
    
    const debouncedRender = debounce((opts) => {
      list.innerHTML = "";
      opts.forEach(dep => {
        const div = document.createElement("div");
        div.className = "autocomplete-item";
        div.textContent = dep;
        div.onclick = () => { input.value = dep; list.classList.add("hidden"); };
        list.appendChild(div);
      });
      list.classList.toggle("hidden", opts.length===0);
    }, 150);

    input.addEventListener("focus", () => debouncedRender(departamentos));
    input.addEventListener("input", () => {
      const v = normalize(input.value);
      debouncedRender(departamentos.filter(d=>normalize(d).includes(v)));
    });
    input.addEventListener("blur", ()=> setTimeout(()=>list.classList.add("hidden"),120));
  }

  function setupAutocompleteColaboradores() {
    const input = document.getElementById("buscaColaborador");
    const list = document.getElementById("colaborador-list");
    
    const debouncedRender = debounce((opts) => {
      list.innerHTML = "";
      opts.forEach(col => {
        const div = document.createElement("div");
        div.className = "autocomplete-item";
        div.textContent = col.nome;
        div.onclick = () => { input.value = col.nome; list.classList.add("hidden"); };
        list.appendChild(div);
      });
      list.classList.toggle("hidden", opts.length===0);
    }, 150);

    input.addEventListener("focus", ()=> debouncedRender(colaboradores));
    input.addEventListener("input", ()=> {
      const v = normalize(input.value);
      debouncedRender(colaboradores.filter(c=>normalize(c.nome).includes(v)));
    });
    input.addEventListener("blur", ()=> setTimeout(()=>list.classList.add("hidden"),120));
  }

  /*******************************
    parent match helper (robust)
  *******************************/
  function findParentKey(gestorNorm, allByName) {
    if (!gestorNorm) return null;
    if (allByName[gestorNorm]) return gestorNorm;
    // try full substring match
    const keys = Object.keys(allByName);
    for (const k of keys) {
      if (!k) continue;
      if (k.includes(gestorNorm) || gestorNorm.includes(k)) return k;
    }
    // try last-name match
    const last = gestorNorm.split(' ').slice(-1)[0];
    if (last) {
      for (const k of keys) {
        const kLast = k.split(' ').slice(-1)[0];
        if (kLast === last) return k;
      }
    }
    // compact match ignoring punctuation
    const compact = gestorNorm.replace(/[^a-z0-9]/g,'');
    for (const k of keys) {
      if (k.replace(/[^a-z0-9]/g,'') === compact) return k;
    }
    return null;
  }

  /*******************************
    buildHierarchy: based on gestorDireto,
    set collapsed=true by default; open presidents & top multi-level managers
  *******************************/
  function buildHierarchy(colabs) {
    const cacheKey = JSON.stringify(colabs.map(c => c.nome).sort());
    if (hierarchyCache.has(cacheKey)) {
      return JSON.parse(JSON.stringify(hierarchyCache.get(cacheKey)));
    }

    const allByName = {};
    colaboradores.forEach(c=>{
      const key = normalize(c.nome);
      allByName[key] = {
        name: (c.nome || "").trim(),
        title: c.cargo || "",
        gestorRaw: c.gestorDireto || "",
        gestor: normalize(c.gestorDireto),
        departamento: c.departamento || "",
        collapsed: true,
        children: []
      };
    });

    // attach children using findParentKey for robustness
    Object.values(allByName).forEach(node => {
      const pkey = findParentKey(node.gestor, allByName);
      if (pkey && allByName[pkey]) {
        allByName[pkey].children.push(node);
      }
    });

    // mark hasChildren
    Object.values(allByName).forEach(n => n.hasChildren = (n.children && n.children.length > 0));

    // roots: those not attached as child to anyone
    const attached = new Set();
    Object.values(allByName).forEach(n => (n.children||[]).forEach(c => attached.add(normalize(c.name))));
    const roots = Object.values(allByName).filter(n => !attached.has(normalize(n.name)));

    // filter by subset (colabs) - keep nodes that are in subset or have descendants in subset
    function filterTree(node) {
      const inSubset = colabs.some(c => normalize(c.nome) === normalize(node.name));
      const filteredChildren = (node.children||[]).map(filterTree).filter(Boolean);
      if (inSubset || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren, hasChildren: node.hasChildren, collapsed: node.collapsed };
      }
      return null;
    }
    const filteredRoots = roots.map(filterTree).filter(Boolean);

    // detect presidents and open them and open nodes that have multi-level structure
    const presidents = filteredRoots.filter(r => {
      const n = normalize(r.name || "");
      return n.includes("marco alberto") || n.includes("robson porfirio") || n.includes("president") || n.includes("presidente");
    });

    const root = { name: "ROOT", invisible: true, children: [...presidents, ...filteredRoots.filter(r=>!presidents.includes(r))] };

    // Open presidents and nodes that have grandchildren (to reveal important structure)
    function openImportant(node) {
      if (!node || !node.children) return;
      if (node.name) {
        const n = normalize(node.name || "");
        if (presidents.some(p => normalize(p.name || "") === n)) node.collapsed = false;
      }
      if (node.children.some(ch => ch.children && ch.children.length > 0)) {
        node.collapsed = false;
      }
      node.children.forEach(openImportant);
    }
    openImportant(root);

    // Keep Andre Frigatto expanded if present (user note)
    function openByName(rootNode, targetSubstr) {
      if (!rootNode) return;
      if ((rootNode.name || "").toLowerCase().includes(targetSubstr)) {
        rootNode.collapsed = false;
      }
      if (rootNode.children) rootNode.children.forEach(ch => openByName(ch, targetSubstr));
    }
    openByName(root, 'andre frigatto');

    hierarchyCache.set(cacheKey, JSON.parse(JSON.stringify(root)));
    lastHierarchy = root;
    return root;
  }

  /*******************************
    pruneForRender: apply collapsed flags
  *******************************/
  function pruneForRender(node) {
    const copy = { ...node };
    if (!node.children || node.children.length === 0) { copy.children = []; return copy; }
    const isRoot = node.invisible === true;
    if (isRoot || node.collapsed === false) {
      copy.children = node.children.map(pruneForRender).filter(Boolean);
    } else {
      copy.children = [];
    }
    return copy;
  }

  /*******************************
    findAndToggleCollapsed
  *******************************/
  function findAndToggleCollapsed(root, nameNorm) {
    if (!root) return false;
    const n = normalize(root.name || "");
    if (n === nameNorm) {
      root.collapsed = !root.collapsed;
      return true;
    }
    if (root.children && root.children.length) {
      for (const c of root.children) {
        if (findAndToggleCollapsed(c, nameNorm)) return true;
      }
    }
    return false;
  }

  /*******************************
    expandAncestorsOf
  *******************************/
  function expandAncestorsOf(root, targetNorm) {
    function helper(node) {
      if (!node) return false;
      const n = normalize(node.name || "");
      if (node.children && node.children.length) {
        for (const ch of node.children) {
          if (helper(ch)) {
            node.collapsed = false;
            return true;
          }
        }
      }
      if (n === targetNorm) return true;
      return false;
    }
    helper(root);
  }

  /*******************************
    renderTree: d3.tree vertical layout (children below)
  *******************************/
  function renderTree(rootData, highlightName=null) {
    requestAnimationFrame(() => {
      const startTime = performance.now();
      
      // Update responsive dimensions
      getResponsiveDimensions();
      
      // preserve transform
      let preserved = null;
      try { if (currentSVG && currentSVG.node()) preserved = d3.zoomTransform(currentSVG.node()); } catch(e){ preserved = null; }

      const pruned = pruneForRender(rootData);
      const root = d3.hierarchy(pruned);
      const treeLayout = d3.tree().nodeSize([NODE_H_SPACING, NODE_V_SPACING]);
      treeLayout(root);

      const chart = d3.select("#chart");
      chart.selectAll("svg").remove();

      const nodes = root.descendants();
      const links = root.links();

      // compute bounding box
      const xMin = d3.min(nodes,d=>d.x), xMax = d3.max(nodes,d=>d.x), yMax = d3.max(nodes,d=>d.y || 0);
      const width = (isFinite(xMax - xMin) ? xMax - xMin + BOX_W*4 : 1000);
      const height = (isFinite(yMax) ? yMax + BOX_H*4 : 800);

      currentSVG = chart.append("svg")
        .attr("width", Math.max(width, 1000))
        .attr("height", Math.max(height, 600))
        .style("display","block");

      const g = currentSVG.append("g").attr("transform", `translate(${GROUP_OFFSET},${GROUP_OFFSET})`);

      // Draw links as L-shaped but consistent (avoid curved spaghetti)
      g.append("g")
        .selectAll("path")
        .data(links.filter(d => !d.target.data.invisible))
        .join("path")
        .attr("fill","none")
        .attr("stroke", currentTheme.linkStroke)
        .attr("stroke-width", 1.2)
        .attr("d", d => {
          const sx = d.source.x;
          const sy = d.source.y + BOX_H/2;
          const tx = d.target.x;
          const ty = d.target.y - BOX_H/2;
          const midY = sy + (ty - sy) * 0.5;
          // vertical down from parent to midY, horizontal to target.x, vertical to child top
          return `M${sx},${sy} V${midY} H${tx} V${ty}`;
        })
        .attr("stroke-linecap","round");

      // Nodes
      const node = g.append("g")
        .selectAll("g")
        .data(nodes.filter(d=>!d.data.invisible))
        .join("g")
        .attr("transform", d => `translate(${d.x - BOX_W/2},${d.y - BOX_H/2})`)
        .attr("data-name", d => normalize(d.data.name || ""));

      node.append("rect")
        .attr("class", d => (highlightName && normalize(d.data.name)===normalize(highlightName)) ? "node-box highlight" : "node-box")
        .attr("width", BOX_W)
        .attr("height", BOX_H)
        .style("fill", d=> d.data.hasChildren ? currentTheme.nodeManagerBg : currentTheme.nodeBg)
        .style("stroke", currentTheme.boxStroke)
        .style("cursor", d => (d.data.hasChildren ? 'pointer' : 'default'))
        .on("click", function(event, d) {
          const norm = normalize(d.data.name || "");
          let currentTransform = null;
          try { currentTransform = d3.zoomTransform(currentSVG.node()); } catch(e){ currentTransform = null; }
          if (d.data.hasChildren) {
            findAndToggleCollapsed(lastHierarchy, norm);
            try {
              renderTree(lastHierarchy, null);
              if (currentTransform) {
                try { currentSVG.transition().duration(200).call(globalZoom.transform, d3.zoomIdentity.translate(currentTransform.x, currentTransform.y).scale(currentTransform.k)); } catch(e){}
              }
            } catch(err) { console.error(err); }
          } else {
            highlightColaborador(d.data.name);
          }
        });

      const fontSize = getResponsiveDimensions().fontSize;

      node.append("text")
        .attr("class","node-name")
        .attr("x", BOX_W/2)
        .attr("y", BOX_H/2 - 10)
        .attr("text-anchor","middle")
        .style("font-size", d => (d.data.name && d.data.name.length > 20 ? "11px" : fontSize.name))
        .text(d => d.data.name || "")
        .attr("fill", currentTheme.nameColor);

      node.append("text")
        .attr("class","node-title")
        .attr("x", BOX_W/2)
        .attr("y", BOX_H/2 + 13)
        .style("font-size", d => (d.data.title && d.data.title.length > 25 ? "10px" : fontSize.title))
        .attr("text-anchor","middle")
        .text(d=>d.data.title || "")
        .attr("fill", currentTheme.titleColor);

      node.append("text")
        .attr("class","node-dep")
        .attr("x", BOX_W/2)
        .attr("y", BOX_H/2 + 28)
        .attr("text-anchor","middle")
        .style("font-size", fontSize.dep)
        .text(d => d.data.departamento || "")
        .attr("fill", currentTheme.secondaryText);

      // expander icon at top-right of box
      node.filter(d => d.data.hasChildren)
        .append("text")
        .attr("class","expander")
        .attr("x", BOX_W - 12)
        .attr("y", 18)
        .attr("text-anchor","end")
        .style("font-size","16px")
        .style("cursor","pointer")
        .text(d => (d.data.collapsed ? "+" : "−"))
        .on("click", function(event, d) {
          event.stopPropagation();
          const norm = normalize(d.data.name || "");
          let currentTransform = null;
          try { currentTransform = d3.zoomTransform(currentSVG.node()); } catch(e){ currentTransform = null; }
          findAndToggleCollapsed(lastHierarchy, norm);
          renderTree(lastHierarchy, null);
          if (currentTransform) {
            try { currentSVG.transition().duration(200).call(globalZoom.transform, d3.zoomIdentity.translate(currentTransform.x, currentTransform.y).scale(currentTransform.k)); } catch(e){}
          }
        });

      // zoom/pan
      globalZoom = d3.zoom().scaleExtent([ZOOM_MIN, ZOOM_MAX]).on("zoom", (event)=> g.attr("transform", event.transform));
      currentSVG.call(globalZoom);

      // Setup touch gestures for mobile
      setupTouchGestures();

      // restore transform or center
      if (preserved) {
        try {
          currentSVG.transition().duration(100).call(globalZoom.transform, d3.zoomIdentity.translate(preserved.x, preserved.y).scale(preserved.k));
        } catch(e){}
      } else {
        try {
          const container = document.getElementById("orgContainer");
          const cw = container.clientWidth;
          const ch = container.clientHeight;
          const tx = Math.max(0, (cw - width) / 2);
          const ty = Math.max(0, (ch - height) / 2);
          currentSVG.transition().duration(300).call(globalZoom.transform, d3.zoomIdentity.translate(tx, ty).scale(1));
        } catch(err){ console.warn("Não foi possível centralizar automaticamente:", err); }
      }

      const endTime = performance.now();
      console.log(`Renderização concluída em ${endTime - startTime}ms`);
      
      // Limpar cache se renderização demorar muito
      if (endTime - startTime > 100) {
        hierarchyCache.clear();
      }
    });
  }

  /*******************************
    Touch Gestures for Mobile
  *******************************/
  function setupTouchGestures() {
    const svg = currentSVG.node();
    let startX, startY, startDistance;
    
    svg.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        startDistance = getTouchDistance(e.touches);
      } else if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
    });
    
    svg.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        // Pinch zoom
        const currentDistance = getTouchDistance(e.touches);
        const scale = currentDistance / startDistance;
        globalZoom.scaleBy(currentSVG.transition().duration(0), scale);
        startDistance = currentDistance;
        e.preventDefault();
      } else if (e.touches.length === 1) {
        // Pan
        const deltaX = e.touches[0].clientX - startX;
        const deltaY = e.touches[0].clientY - startY;
        globalZoom.translateBy(currentSVG.transition().duration(0), deltaX, deltaY);
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        e.preventDefault();
      }
    });

    function getTouchDistance(touches) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
  }

  /*******************************
    public operations
  *******************************/
  function renderizar(dep) {
    const subset = collectSubset(dep);
    const hierarchy = buildHierarchy(subset);
    renderTree(hierarchy, null);
  }

  function highlightColaborador(nome) {
    if (!nome) return;
    const subset = collectSubset(document.getElementById("departamento").value || "TODOS");
    const found = subset.some(c => normalize(c.nome) === normalize(nome));
    if (!found) { alert("Colaborador não encontrado no conjunto atual."); return; }
    const hierarchy = buildHierarchy(subset);
    expandAncestorsOf(hierarchy, normalize(nome));
    lastHierarchy = hierarchy;
    renderTree(hierarchy, nome);
    setTimeout(()=> focusOnNode(nome), 300);
  }

  function focusOnNode(nome) {
    if (!currentSVG || !globalZoom) { console.warn("SVG ainda não renderizado."); return; }
    const norm = normalize(nome);
    const selector = `#chart svg g g[data-name="${CSS.escape(norm)}"]`;
    const nodeG = document.querySelector(selector);
    if (!nodeG) { alert("Não foi possível localizar o nó no gráfico."); return; }

    let matrix = null;
    try {
      if (nodeG.transform && nodeG.transform.baseVal && nodeG.transform.baseVal.numberOfItems) {
        matrix = nodeG.transform.baseVal.consolidate().matrix;
      } else {
        const tr = nodeG.getAttribute('transform') || '';
        const m = tr.match(/translate\(\s*([-\d.]+)[ ,]+([-\d.]+)\s*\)/);
        matrix = { e: m ? parseFloat(m[1]) : 0, f: m ? parseFloat(m[2]) : 0 };
      }
    } catch (err) {
      console.warn("Erro lendo transform do nó:", err);
      matrix = { e: 0, f: 0 };
    }

    const nodeCenterX = matrix.e + BOX_W/2 + GROUP_OFFSET;
    const nodeCenterY = matrix.f + BOX_H/2 + GROUP_OFFSET;

    const container = document.getElementById("orgContainer");
    const vw = container.clientWidth;
    const vh = container.clientHeight;

    let desiredScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.min(vw / (BOX_W * 2), vh / (BOX_H * 2), 1.4)));
    if (isNaN(desiredScale) || !isFinite(desiredScale)) desiredScale = 1;

    let currentTransform = d3.zoomTransform(currentSVG.node());
    const currentScale = currentTransform ? currentTransform.k : 1;
    let targetScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.max(currentScale, desiredScale)));

    const tx = vw/2 - targetScale * nodeCenterX;
    const ty = vh/2 - targetScale * nodeCenterY;

    try {
      currentSVG.transition().duration(700).call(globalZoom.transform, d3.zoomIdentity.translate(tx, ty).scale(targetScale));
    } catch (err) {
      console.error("Erro aplicando zoom transform:", err);
    }

    try {
      const rect = nodeG.querySelector('rect');
      if (rect) { rect.classList.add('highlight'); setTimeout(()=> rect.classList.remove('highlight'), 2000); }
    } catch (err) { console.warn("Não foi possível aplicar destaque:", err); }
  }

  /*******************************
    subset helper
  *******************************/
  function collectSubset(depSelecionado) {
    if (!depSelecionado || depSelecionado === "TODOS") return colaboradores.slice();
    if (depSelecionado === "SEM_GESTOR") return colaboradores.filter(c => !c.gestorDireto?.trim());
    return colaboradores.filter(c => c.departamento === depSelecionado);
  }

  /*******************************
    UI bindings + export/crop (kept from original)
  *******************************/
  document.getElementById("btnFiltrar").addEventListener("click", ()=>{
    const dep = document.getElementById("departamento").value || "TODOS";
    renderizar(dep);
  });
  
  const debouncedHighlight = debounce(() => {
    const nome = document.getElementById("buscaColaborador").value;
    highlightColaborador(nome);
  }, 300);
  
  document.getElementById("btnIrColaborador").addEventListener("click", debouncedHighlight);
  
  document.getElementById("zoomIn").addEventListener("click", ()=>{
    if (currentSVG && globalZoom) currentSVG.transition().duration(300).call(globalZoom.scaleBy, 1.2);
  });
  document.getElementById("zoomOut").addEventListener("click", ()=>{
    if (currentSVG && globalZoom) currentSVG.transition().duration(300).call(globalZoom.scaleBy, 0.8);
  });
  document.getElementById("resetZoom").addEventListener("click", ()=>{
    if (currentSVG && globalZoom) currentSVG.transition().duration(300).call(globalZoom.transform, d3.zoomIdentity);
  });

  const btnCamera = document.getElementById("btnCamera");
  const cameraDropdown = document.getElementById("cameraDropdown");
  btnCamera.addEventListener("click", () => cameraDropdown.classList.toggle("hidden"));

  function showSpinner(message = "Gerando imagem...") {
    if (document.getElementById(SPINNER_ID)) return;
    const overlay = document.createElement("div");
    overlay.id = SPINNER_ID;
    overlay.className = "processing-overlay";
    const spinner = document.createElement("div");
    spinner.className = "spinner";
    const txt = document.createElement("div");
    txt.style.marginTop = "6px";
    txt.style.fontSize = "14px";
    txt.textContent = message;
    overlay.appendChild(spinner);
    overlay.appendChild(txt);
    document.body.appendChild(overlay);
  }
  function hideSpinner() { const el = document.getElementById(SPINNER_ID); if (el) el.remove(); }

  function getExportOptions() {
    const bg = document.getElementById("exportBackground").value;
    const scale = Number(document.getElementById("exportScale").value) || 1;
    return { bg, scale };
  }

  document.getElementById("exportVisible").addEventListener("click", async () => {
    cameraDropdown.classList.add("hidden");
    const { bg, scale } = getExportOptions();
    const container = document.getElementById("orgContainer");
    const prevBg = container.style.backgroundColor || window.getComputedStyle(container).backgroundColor;
    if (bg === "white") container.style.backgroundColor = "#ffffff";
    else if (bg === "brand") container.style.backgroundColor = "#00AEEF";
    else if (bg === "transparent") container.style.backgroundColor = "transparent";

    showSpinner("Gerando imagem...");
    try {
      await ensureHtml2Canvas();
      const htmlOpts = { useCORS: true, scale: scale, backgroundColor: (bg === "transparent" ? null : undefined) };
      const canvas = await html2canvas(container, htmlOpts);
      capturedCanvas = canvas;
      hideSpinner();
      showExportModal(capturedCanvas);
    } catch (err) {
      console.error("Erro ao capturar área visível:", err);
      hideSpinner();
      alert("Falha ao capturar a área visível. Veja o console.");
    } finally {
      setTimeout(()=> { container.style.backgroundColor = prevBg; }, 100);
    }
  });

  document.getElementById("exportCrop").addEventListener("click", async () => {
    cameraDropdown.classList.add("hidden");
    startCropMode();
  });

  // crop logic (kept)
  let overlay = null, selectionBox = null, isSelecting = false, startX = 0, startY = 0;
  async function startCropMode() {
    overlay = document.createElement("div");
    overlay.id = "cropOverlay";
    overlay.style.position = "fixed";
    overlay.style.top = 0; overlay.style.left = 0; overlay.style.width = "100%"; overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.4)"; overlay.style.cursor = "crosshair"; overlay.style.zIndex = 10000;
    document.body.appendChild(overlay);

    const hint = document.createElement("div");
    hint.className = "crop-hint";
    hint.textContent = "Arraste para selecionar a área. ESC ou Cancelar para sair.";
    document.body.appendChild(hint);

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "crop-cancel-btn";
    cancelBtn.textContent = "Cancelar";
    cancelBtn.onclick = cleanupCrop;
    document.body.appendChild(cancelBtn);

    overlay.addEventListener("mousedown", onOverlayMouseDown);
    overlay.addEventListener("mousemove", onOverlayMouseMove);
    overlay.addEventListener("mouseup", onOverlayMouseUp);

    function onKeyDown(e) { if (e.key === "Escape") cleanupCrop(); }
    window.addEventListener("keydown", onKeyDown, { once: true });

    function cleanupCrop() {
      if (overlay) {
        overlay.removeEventListener("mousedown", onOverlayMouseDown);
        overlay.removeEventListener("mousemove", onOverlayMouseMove);
        overlay.removeEventListener("mouseup", onOverlayMouseUp);
        document.body.removeChild(overlay);
        overlay = null;
      }
      if (selectionBox) { selectionBox.remove(); selectionBox = null; }
      const ch = document.querySelector(".crop-hint"); if (ch) ch.remove();
      const cb = document.querySelector(".crop-cancel-btn"); if (cb) cb.remove();
    }

    async function onOverlayMouseDown(e) {
      isSelecting = true;
      startX = e.clientX; startY = e.clientY;
      selectionBox = document.createElement("div");
      selectionBox.style.position = "absolute";
      selectionBox.style.border = `2px dashed ${currentTheme.cropBorder || '#00AEEF'}`;
      selectionBox.style.background = currentTheme.cropBg || 'rgba(0,174,239,0.15)';
      selectionBox.style.left = `${startX}px`; selectionBox.style.top = `${startY}px`;
      selectionBox.style.zIndex = 10001;
      overlay.appendChild(selectionBox);
    }

    function onOverlayMouseMove(e) {
      if (!isSelecting || !selectionBox) return;
      const curX = e.clientX; const curY = e.clientY;
      const w = curX - startX; const h = curY - startY;
      selectionBox.style.width = `${Math.abs(w)}px`;
      selectionBox.style.height = `${Math.abs(h)}px`;
      selectionBox.style.left = `${w < 0 ? curX : startX}px`;
      selectionBox.style.top = `${h < 0 ? curY : startY}px`;
    }

    async function onOverlayMouseUp(e) {
      if (!isSelecting || !selectionBox) return;
      isSelecting = false;
      const rect = selectionBox.getBoundingClientRect();
      const container = document.getElementById("orgContainer");
      const containerRect = container.getBoundingClientRect();
      const { bg, scale } = getExportOptions();
      const prevBg = container.style.backgroundColor || window.getComputedStyle(container).backgroundColor;
      if (bg === "white") container.style.backgroundColor = "#ffffff";
      else if (bg === "brand") container.style.backgroundColor = "#00AEEF";
      else if (bg === "transparent") container.style.backgroundColor = "transparent";

      showSpinner("Gerando recorte...");
      try {
        await ensureHtml2Canvas();
        const canvas = await html2canvas(container, { useCORS: true, scale: scale, backgroundColor: (bg === "transparent" ? null : undefined) });
        const scaleX = canvas.width / containerRect.width;
        const scaleY = canvas.height / containerRect.height;

        const sx = (rect.left - containerRect.left) * scaleX;
        const sy = (rect.top - containerRect.top) * scaleY;
        const sw = rect.width * scaleX;
        const sh = rect.height * scaleY;

        const sxClamped = Math.max(0, Math.min(canvas.width, sx));
        const syClamped = Math.max(0, Math.min(canvas.height, sy));
        const swClamped = Math.max(1, Math.min(canvas.width - sxClamped, sw));
        const shClamped = Math.max(1, Math.min(canvas.height - syClamped, sh));

        const cropped = document.createElement("canvas");
        cropped.width = Math.round(swClamped);
        cropped.height = Math.round(shClamped);
        const ctx = cropped.getContext("2d");
        ctx.drawImage(canvas, sxClamped, syClamped, swClamped, shClamped, 0, 0, cropped.width, cropped.height);

        capturedCanvas = cropped;
        cleanupCrop();
        hideSpinner();
        showExportModal(capturedCanvas);
      } catch (err) {
        console.error("Erro ao gerar recorte:", err);
        hideSpinner();
        cleanupCrop();
        alert("Falha ao gerar recorte. Veja o console para detalhes.");
      } finally {
        setTimeout(()=> { container.style.backgroundColor = prevBg; }, 100);
      }
    }
  }

  function showExportModal(canvas) {
    const modal = document.getElementById("exportModal");
    modal.classList.remove("hidden");

    const btnPNG = document.getElementById("confirmPNG");
    const btnPDF = document.getElementById("confirmPDF");
    const btnCancel = document.getElementById("cancelExport");
    const btnRedo = document.getElementById("redoSelection");

    btnPNG.onclick = null; btnPDF.onclick = null; btnCancel.onclick = null; btnRedo.onclick = null;

    btnPNG.onclick = () => {
      try {
        const link = document.createElement("a");
        link.download = "captura.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
      } catch (err) {
        console.error("Erro ao salvar PNG:", err);
        alert("Erro ao salvar PNG. Veja o console.");
      }
      modal.classList.add("hidden");
    };

    btnPDF.onclick = async () => {
      try {
        await ensureJsPDF();
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF("l", "pt", [canvas.width, canvas.height]);
        showSpinner("Gerando PDF...");
        setTimeout(()=> {
          try {
            pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
            pdf.save("captura.pdf");
          } catch (e) {
            console.error("Erro ao gerar PDF:", e);
            alert("Erro ao gerar PDF. Veja o console.");
          } finally {
            hideSpinner();
          }
        }, 50);
      } catch (err) {
        console.error("Erro ao salvar PDF:", err);
        alert("Erro ao salvar PDF. Veja o console.");
        hideSpinner();
      }
      modal.classList.add("hidden");
    };

    btnCancel.onclick = () => modal.classList.add("hidden");

    btnRedo.onclick = () => {
      modal.classList.add("hidden");
      setTimeout(()=> startCropMode(), 60);
    };
  }

  /*******************************
    CORREÇÃO DO TOGGLE - FUNCIONANDO
  *******************************/
  const toggleSwitch = document.getElementById('toggleThemeSwitch');
  
  // Carregar tema salvo ou usar padrão
  function loadSavedTheme() {
    const savedTheme = localStorage.getItem('organograma-theme');
    if (savedTheme === 'dark') {
      currentTheme = THEME_NIGHT;
      toggleSwitch.checked = true;
    } else {
      currentTheme = THEME_LIGHT;
      toggleSwitch.checked = false;
    }
    applyThemeVars(currentTheme);
  }

  // Salvar tema
  function saveTheme(theme) {
    localStorage.setItem('organograma-theme', theme === THEME_NIGHT ? 'dark' : 'light');
  }

  // Event listener corrigido
  toggleSwitch.addEventListener('change', function() {
    currentTheme = this.checked ? THEME_NIGHT : THEME_LIGHT;
    applyThemeVars(currentTheme);
    saveTheme(currentTheme);
    
    // Re-renderizar o organograma com o novo tema
    if (colaboradores && colaboradores.length) {
      const dep = document.getElementById("departamento")?.value || "TODOS";
      renderizar(dep);
    }
  });

  // Corrigir o clique no container do toggle
  document.querySelectorAll('.theme-switch').forEach(el => {
    el.addEventListener('click', (e) => {
      // Evitar duplo toggle quando clicar diretamente no switch
      if (!e.target.closest('.switch')) {
        const cb = document.getElementById('toggleThemeSwitch');
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change'));
      }
    });
  });

  // Handle window resize
  window.addEventListener('resize', debounce(() => {
    if (colaboradores && colaboradores.length) {
      const dep = document.getElementById("departamento")?.value || "TODOS";
      renderizar(dep);
    }
  }, 250));

  /*******************************
    start
  *******************************/
  // Carregar tema salvo ao iniciar
  loadSavedTheme();
  getColaboradores();
  window.startCropMode = startCropMode;
</script>
