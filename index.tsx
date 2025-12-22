import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import * as d3 from 'd3';
import { 
  Plus, 
  Search, 
  Settings, 
  Save, 
  Trash2, 
  X, 
  BrainCircuit, 
  User, 
  HelpCircle,
  Filter,
  MousePointerClick
} from 'lucide-react';

// --- Types ---

type QuadrantType = 'q1' | 'q2' | 'q3' | 'q4';

interface KnowledgeNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  description: string;
  quadrant: QuadrantType;
  tags: string[];
  group?: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface KnowledgeLink extends d3.SimulationLinkDatum<KnowledgeNode> {
  id: string;
  source: string | KnowledgeNode;
  target: string | KnowledgeNode;
}

interface AppState {
  nodes: KnowledgeNode[];
  links: KnowledgeLink[];
  tags: string[];
}

// --- Constants ---

const QUADRANTS = {
  q2: { id: 'q2', label: 'Learning Zone', sub: 'AI Knows · I Don\'t', color: '#3b82f6', bg: '#eff6ff', xDir: -1, yDir: -1 }, // Top Left
  q1: { id: 'q1', label: 'Common Knowledge', sub: 'AI Knows · I Know', color: '#10b981', bg: '#ecfdf5', xDir: 1, yDir: -1 }, // Top Right
  q4: { id: 'q4', label: 'The Unknown', sub: 'AI Doesn\'t · I Don\'t', color: '#64748b', bg: '#f1f5f9', xDir: -1, yDir: 1 }, // Bottom Left
  q3: { id: 'q3', label: 'My Insights', sub: 'AI Doesn\'t · I Know', color: '#f59e0b', bg: '#fffbeb', xDir: 1, yDir: 1 }, // Bottom Right
};

const INITIAL_DATA: AppState = {
  nodes: [
    { id: '1', label: 'React Basics', description: 'Component lifecycle, hooks', quadrant: 'q1', tags: ['dev', 'frontend'] },
    { id: '2', label: 'Quantum Physics', description: 'General understanding of entanglement', quadrant: 'q2', tags: ['science'] },
    { id: '3', label: 'Grandma\'s Cookie Recipe', description: 'The secret ingredient is nutmeg', quadrant: 'q3', tags: ['personal', 'cooking'] },
    { id: '4', label: 'Meaning of Life', description: 'Still figuring this one out', quadrant: 'q4', tags: ['philosophy'] },
  ],
  links: [],
  tags: ['dev', 'frontend', 'science', 'personal', 'cooking', 'philosophy']
};

// --- Components ---

const KnowledgeGraph = () => {
  // --- State ---
  const [data, setData] = useState<AppState>(() => {
    const saved = localStorage.getItem('knowledge-graph-data');
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  });

  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'add' | 'details' | 'filter'>('add');
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 }); // Track zoom for click calculation
  
  // Filters
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [visibleQuadrants, setVisibleQuadrants] = useState<Record<string, boolean>>({
    q1: true, q2: true, q3: true, q4: true
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    label: '',
    description: '',
    quadrant: 'q1' as QuadrantType,
    tags: ''
  });

  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<KnowledgeNode, KnowledgeLink> | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('knowledge-graph-data', JSON.stringify(data));
  }, [data]);

  // --- D3 Logic ---

  useEffect(() => {
    if (!svgRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const svg = d3.select(svgRef.current);
    
    // Clear previous
    svg.selectAll("*").remove();

    // Create container for zoom
    const container = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
        setTransform({ k: event.transform.k, x: event.transform.x, y: event.transform.y });
      });
    svg.call(zoom);

    // Initial Center
    const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(1);
    svg.call(zoom.transform, initialTransform);

    // --- Draw Quadrant Backgrounds ---
    const bgGroup = container.append("g").attr("class", "backgrounds");
    const quadrantSize = 4000; // Large enough to cover zoom area

    Object.values(QUADRANTS).forEach(q => {
      // Background Rect
      bgGroup.append("rect")
        .attr("x", q.xDir > 0 ? 0 : -quadrantSize)
        .attr("y", q.yDir > 0 ? 0 : -quadrantSize)
        .attr("width", quadrantSize)
        .attr("height", quadrantSize)
        .attr("fill", q.bg)
        .attr("opacity", 0.6);

      // Watermark Label
      const labelX = q.xDir * 300;
      const labelY = q.yDir * 200;
      
      const watermark = bgGroup.append("g")
        .attr("transform", `translate(${labelX}, ${labelY})`)
        .attr("opacity", 0.15)
        .style("pointer-events", "none");

      watermark.append("text")
        .text(q.label)
        .attr("text-anchor", "middle")
        .attr("font-size", "48px")
        .attr("font-weight", "bold")
        .attr("fill", q.color);
      
      watermark.append("text")
        .text(q.sub)
        .attr("text-anchor", "middle")
        .attr("dy", "50px")
        .attr("font-size", "24px")
        .attr("fill", q.color);
    });

    // Axes
    const axisGroup = container.append("g").attr("class", "axes");
    
    axisGroup.append("line")
      .attr("x1", -quadrantSize).attr("y1", 0)
      .attr("x2", quadrantSize).attr("y2", 0)
      .attr("stroke", "#cbd5e1").attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");
    
    axisGroup.append("line")
      .attr("x1", 0).attr("y1", -quadrantSize)
      .attr("x2", 0).attr("y2", quadrantSize)
      .attr("stroke", "#cbd5e1").attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");
      
    // Central Hub
    axisGroup.append("circle")
      .attr("r", 6)
      .attr("fill", "#64748b");

    // Filter Data for Visualization
    const visibleNodes = data.nodes.filter(n => {
      const quadMatch = visibleQuadrants[n.quadrant];
      const tagMatch = filterTags.length === 0 || n.tags.some(t => filterTags.includes(t));
      const searchMatch = !searchTerm || n.label.toLowerCase().includes(searchTerm.toLowerCase());
      return quadMatch && tagMatch && searchMatch;
    }).map(d => ({ ...d }));

    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    const visibleLinks = data.links
      .filter(l => visibleNodeIds.has(l.source as string) && visibleNodeIds.has(l.target as string))
      .map(d => ({ ...d }));

    // Simulation Setup
    const simulation = d3.forceSimulation<KnowledgeNode, KnowledgeLink>(visibleNodes)
      .force("link", d3.forceLink<KnowledgeNode, KnowledgeLink>(visibleLinks).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("collide", d3.forceCollide().radius(40))
      // Stronger pull to quadrant centers
      .force("x", d3.forceX<KnowledgeNode>(d => QUADRANTS[d.quadrant].xDir * 250).strength(0.4))
      .force("y", d3.forceY<KnowledgeNode>(d => QUADRANTS[d.quadrant].yDir * 250).strength(0.4));

    simulationRef.current = simulation;

    // Draw Links
    const link = container.append("g")
      .selectAll("line")
      .data(visibleLinks)
      .join("line")
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.6);

    // Draw Nodes
    const node = container.append("g")
      .selectAll("g")
      .data(visibleNodes)
      .join("g")
      .call(d3.drag<SVGGElement, KnowledgeNode>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      )
      .on("click", (event, d) => {
        const original = data.nodes.find(n => n.id === d.id) || d;
        setSelectedNode(original);
        setActiveTab('details');
        setIsPanelOpen(true);
        event.stopPropagation();
      });

    // Node Visuals
    node.append("circle")
      .attr("r", 24)
      .attr("fill", "white")
      .attr("stroke", d => QUADRANTS[d.quadrant].color)
      .attr("stroke-width", 3)
      .attr("cursor", "pointer")
      .style("filter", "drop-shadow(0px 2px 4px rgba(0,0,0,0.1))");

    // Icon/Letter inside node
    node.append("text")
      .text(d => d.label.charAt(0).toUpperCase())
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("fill", d => QUADRANTS[d.quadrant].color)
      .attr("font-weight", "bold")
      .attr("font-size", "14px")
      .style("pointer-events", "none");

    // Full Label below
    node.append("text")
      .text(d => d.label)
      .attr("dy", 42)
      .attr("text-anchor", "middle")
      .attr("fill", "#1e293b")
      .attr("font-size", "12px")
      .attr("font-weight", "500")
      .style("pointer-events", "none")
      .style("text-shadow", "0 1px 4px rgba(255,255,255,0.9)");

    // Ticker
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as KnowledgeNode).x!)
        .attr("y1", d => (d.source as KnowledgeNode).y!)
        .attr("x2", d => (d.target as KnowledgeNode).x!)
        .attr("y2", d => (d.target as KnowledgeNode).y!);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [data, filterTags, visibleQuadrants, searchTerm]);

  // --- Handlers ---

  const handleSvgDoubleClick = (e: React.MouseEvent) => {
    // Only trigger if clicking background
    if ((e.target as Element).tagName !== 'svg') return;

    // Calculate position relative to center based on zoom/pan
    // Screen coordinates
    const clickX = e.clientX;
    const clickY = e.clientY;
    
    // SVG center coordinates (assuming initial translate centered 0,0)
    // We need to invert the transform to get the "world" coordinates
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const rawX = (clickX - transform.x) / transform.k;
    const rawY = (clickY - transform.y) / transform.k;

    // Determine quadrant based on raw world coordinates
    let quadrant: QuadrantType = 'q1';
    if (rawX < 0 && rawY < 0) quadrant = 'q2'; // Top Left
    else if (rawX >= 0 && rawY < 0) quadrant = 'q1'; // Top Right
    else if (rawX < 0 && rawY >= 0) quadrant = 'q4'; // Bottom Left
    else quadrant = 'q3'; // Bottom Right

    setFormData(prev => ({ ...prev, quadrant }));
    setActiveTab('add');
    setIsPanelOpen(true);
  };

  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label) return;

    const newTags = formData.tags.split(',').map(t => t.trim()).filter(t => t);
    const updatedTags = Array.from(new Set([...data.tags, ...newTags]));

    const newNode: KnowledgeNode = {
      id: Date.now().toString(),
      label: formData.label,
      description: formData.description,
      quadrant: formData.quadrant,
      tags: newTags
    };

    setData(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      tags: updatedTags
    }));

    setFormData({ label: '', description: '', quadrant: 'q1', tags: '' });
    simulationRef.current?.alpha(1).restart();
  };

  const handleDeleteNode = (id: string) => {
    setData(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== id),
      links: prev.links.filter(l => l.source !== id && l.target !== id)
    }));
    setSelectedNode(null);
    setIsPanelOpen(false);
  };

  // --- UI Render ---

  return (
    <div className="relative w-screen h-screen bg-white font-sans overflow-hidden">
      
      {/* Top Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-white/90 backdrop-blur shadow-md rounded-full px-4 py-2 border border-slate-200">
         <Search size={18} className="text-slate-400" />
         <input 
           type="text" 
           placeholder="Search knowledge..." 
           className="bg-transparent outline-none text-sm w-48 text-slate-700"
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
         />
      </div>

      {/* Main Graph Area */}
      <svg 
        ref={svgRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onDoubleClick={handleSvgDoubleClick}
        onClick={() => { setSelectedNode(null); if(isPanelOpen && activeTab === 'details') setIsPanelOpen(false); }}
      />
      
      {/* Interaction Hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-slate-400 text-xs pointer-events-none bg-white/50 px-3 py-1 rounded-full">
         Double-click any quadrant to add a note
      </div>

      {/* Control Panel Toggle */}
      <button 
        onClick={() => { setIsPanelOpen(!isPanelOpen); setActiveTab('add'); }}
        className="absolute top-6 right-6 z-20 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-xl transition-transform hover:scale-105"
      >
        {isPanelOpen ? <X size={24} /> : <Plus size={24} />}
      </button>

      {/* Side Panel */}
      <div className={`absolute top-0 right-0 h-full w-96 bg-white shadow-2xl z-10 transform transition-transform duration-300 ease-in-out flex flex-col border-l border-slate-100 ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="h-20 flex items-center px-8 border-b border-slate-100 bg-slate-50/50">
           <div>
             <h1 className="font-bold text-xl text-slate-800">Knowledge Hub</h1>
             <p className="text-xs text-slate-500 mt-1">Manage your insights</p>
           </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-white">
          <button 
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-4 text-sm font-medium flex justify-center items-center gap-2 transition-colors relative ${activeTab === 'add' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Plus size={16} /> Add
            {activeTab === 'add' && <div className="absolute bottom-0 w-full h-0.5 bg-indigo-600" />}
          </button>
          <button 
            onClick={() => setActiveTab('filter')}
            className={`flex-1 py-4 text-sm font-medium flex justify-center items-center gap-2 transition-colors relative ${activeTab === 'filter' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Filter size={16} /> Filter
            {activeTab === 'filter' && <div className="absolute bottom-0 w-full h-0.5 bg-indigo-600" />}
          </button>
          {selectedNode && (
            <button 
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-4 text-sm font-medium flex justify-center items-center gap-2 transition-colors relative ${activeTab === 'details' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Settings size={16} /> Edit
              {activeTab === 'details' && <div className="absolute bottom-0 w-full h-0.5 bg-indigo-600" />}
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* ADD NODE TAB */}
          {activeTab === 'add' && (
            <form onSubmit={handleAddNode} className="space-y-6">
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Title</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                  placeholder="e.g. React Hooks"
                  value={formData.label}
                  onChange={e => setFormData({...formData, label: e.target.value})}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Quadrant</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.values(QUADRANTS).map(q => (
                    <button
                      type="button"
                      key={q.id}
                      onClick={() => setFormData({...formData, quadrant: q.id as QuadrantType})}
                      className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden group ${formData.quadrant === q.id 
                        ? 'border-transparent ring-2 ring-offset-2' 
                        : 'border-slate-200 hover:border-slate-300'}`}
                      style={{ 
                        '--tw-ring-color': q.color,
                        backgroundColor: formData.quadrant === q.id ? q.bg : 'white'
                      } as any}
                    >
                      <div className="absolute top-0 right-0 w-1 h-full" style={{background: q.color}}></div>
                      <div className="font-semibold text-sm text-slate-800">{q.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-medium">{q.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</label>
                <textarea 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all h-32 resize-none text-sm"
                  placeholder="Add details, notes, or insights..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tags</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm"
                  placeholder="Comma separated (e.g. work, priority)"
                  value={formData.tags}
                  onChange={e => setFormData({...formData, tags: e.target.value})}
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Plus size={20} /> Add Knowledge
              </button>
            </form>
          )}

          {/* FILTER TAB */}
          {activeTab === 'filter' && (
            <div className="space-y-8">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Toggle Zones</label>
                <div className="space-y-3">
                  {Object.values(QUADRANTS).map(q => (
                    <label key={q.id} className="flex items-center p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        checked={visibleQuadrants[q.id]}
                        onChange={() => setVisibleQuadrants(prev => ({...prev, [q.id]: !prev[q.id as any]}))}
                        className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <div className="ml-3 flex-1">
                        <div className="text-sm font-semibold text-slate-700">{q.label}</div>
                        <div className="text-[10px] text-slate-400">{q.sub}</div>
                      </div>
                      <div className="w-2 h-2 rounded-full" style={{background: q.color}}></div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Filter by Tags</label>
                <div className="flex flex-wrap gap-2">
                  {data.tags.length === 0 && <span className="text-sm text-slate-400 italic">No tags created yet.</span>}
                  {data.tags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => {
                        if (filterTags.includes(tag)) {
                          setFilterTags(filterTags.filter(t => t !== tag));
                        } else {
                          setFilterTags([...filterTags, tag]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        filterTags.includes(tag) 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' 
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DETAILS TAB */}
          {activeTab === 'details' && selectedNode && (
            <div className="space-y-6">
               <div className="border-b border-slate-100 pb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: QUADRANTS[selectedNode.quadrant].color }}
                    ></span>
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {QUADRANTS[selectedNode.quadrant].label}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 leading-tight">{selectedNode.label}</h2>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {selectedNode.tags.map(t => (
                      <span key={t} className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">#{t}</span>
                    ))}
                  </div>
               </div>

               <div className="prose prose-sm prose-slate">
                 <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                   {selectedNode.description || "No description provided."}
                 </p>
               </div>

               <div className="pt-8">
                 <button 
                   onClick={() => handleDeleteNode(selectedNode.id)}
                   className="w-full border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                 >
                   <Trash2 size={18} /> Delete Node
                 </button>
               </div>
            </div>
          )}

          {activeTab === 'details' && !selectedNode && (
             <div className="flex flex-col items-center justify-center h-64 text-slate-400">
               <MousePointerClick size={48} className="mb-4 opacity-50" />
               <p className="text-sm">Select a node on the graph to view details.</p>
             </div>
          )}

        </div>
      </div>
    </div>
  );
};

// --- App Entry ---

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <KnowledgeGraph />
    </React.StrictMode>
  );
}
