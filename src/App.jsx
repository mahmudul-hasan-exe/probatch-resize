import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import JSZip from 'jszip'
import { 
  RiDownload2Line, 
  RiFullscreenLine, 
  RiCheckLine, 
  RiArrowRightSLine,
  RiStackLine,
  RiFlashlightLine,
  RiAddLine,
  RiCloseLine,
  RiFileImageLine,
  RiSeparator,
  RiInboxArchiveLine,
  RiLoader4Line
} from '@remixicon/react'
import './index.css'

const PRESETS = [
  { name: 'Standard Preview (700×900)', width: 700, height: 900, icon: <RiFullscreenLine size={16} /> },
]

function App() {
  const [files, setFiles] = useState([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [lockAspectRatio, setLockAspectRatio] = useState(true)
  const [quality, setQuality] = useState(85)
  const [format, setFormat] = useState('image/jpeg')
  const [isDragging, setIsDragging] = useState(false)
  const [isBatching, setIsBatching] = useState(false)
  const [batchProgress, setBatchProgress] = useState(0)
  
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)

  const activeFile = useMemo(() => files[currentIndex] || null, [files, currentIndex])

  const handleFiles = (newFiles) => {
    const validFiles = Array.from(newFiles).filter(file => file.type.startsWith('image/'))
    
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          setFiles(prev => {
            const updated = [...prev, {
              id: Math.random().toString(36).substr(2, 9),
              file,
              url: e.target.result,
              img,
              width: img.width,
              height: img.height,
              aspectRatio: img.width / img.height
            }]
            // If this is the first file, set the initial width/height
            if (updated.length === 1) {
              setCurrentIndex(0)
              setWidth(img.width)
              setHeight(img.height)
            }
            return updated
          })
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  const updateCanvas = useCallback(() => {
    if (!activeFile || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = width
    canvas.height = height

    // Clear and draw
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(activeFile.img, 0, 0, width, height)
  }, [activeFile, width, height])

  useEffect(() => {
    updateCanvas()
  }, [updateCanvas])

  const handleWidthChange = (val) => {
    const newWidth = parseInt(val) || 0
    setWidth(newWidth)
    if (lockAspectRatio && activeFile) {
      setHeight(Math.round(newWidth / activeFile.aspectRatio))
    }
  }

  const handleHeightChange = (val) => {
    const newHeight = parseInt(val) || 0
    setHeight(newHeight)
    if (lockAspectRatio && activeFile) {
      setWidth(Math.round(newHeight * activeFile.aspectRatio))
    }
  }

  const applyPreset = (preset) => {
    setWidth(preset.width)
    setHeight(preset.height)
  }

  const downloadSingle = () => {
    const canvas = canvasRef.current
    const dataUrl = canvas.toDataURL(format, quality / 100)
    const link = document.createElement('a')
    const ext = format.split('/')[1]
    link.download = `resized-${activeFile.file.name.split('.')[0]}.${ext}`
    link.href = dataUrl
    link.click()
  }

  const downloadAll = async () => {
    if (files.length === 0) return
    setIsBatching(true)
    setBatchProgress(0)
    
    const zip = new JSZip()
    const tempCanvas = document.createElement('canvas')
    const ctx = tempCanvas.getContext('2d')

    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      tempCanvas.width = width
      tempCanvas.height = height
      
      // Clear and draw
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(f.img, 0, 0, width, height)
      
      const dataUrl = tempCanvas.toDataURL(format, quality / 100)
      const data = dataUrl.split(',')[1]
      const ext = format.split('/')[1]
      
      zip.file(`resized-${f.file.name.split('.')[0]}.${ext}`, data, { base64: true })
      setBatchProgress(Math.round(((i + 1) / files.length) * 100))
    }

    const content = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(content)
    link.download = `batch-resized-${new Date().getTime()}.zip`
    link.click()
    
    setIsBatching(false)
  }

  const removeFile = (id) => {
    setFiles(prev => {
        const idx = prev.findIndex(f => f.id === id)
        const updated = prev.filter(f => f.id !== id)
        if (currentIndex === idx) {
            setCurrentIndex(updated.length > 0 ? 0 : -1)
        } else if (currentIndex > idx) {
            setCurrentIndex(currentIndex - 1)
        }
        return updated
    })
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden text-slate-900 selection:bg-brand-100 selection:text-brand-900">
      {/* Sidebar - Tools */}
      <aside className="w-80 bg-white border-r border-slate-200/80 flex flex-col z-30">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center text-white">
            <RiInboxArchiveLine size={20} />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg tracking-tight text-slate-900 leading-none">ProBatch</h1>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.1em] mt-1">Image Resizer Studio</p>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto p-5 scroll-smooth scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent hover:scrollbar-thumb-slate-300 flex flex-col ${!activeFile ? 'justify-center items-center' : 'justify-start space-y-8'}`}>
          <AnimatePresence mode="wait">
            {!activeFile ? (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -10 }}
                    key="empty-sidebar"
                    className="text-center"
                >
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-5 text-slate-300 border border-slate-200/50">
                        <RiFileImageLine size={28} />
                    </div>
                    <p className="text-slate-500 text-sm font-bold">Upload Photos</p>
                    <p className="text-slate-400 text-[11px] mt-1 uppercase tracking-wider leading-relaxed">Select a single image or multiple files to begin</p>
                </motion.div>
            ) : (
                <motion.div 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }}
                    key={activeFile.id}
                    className="space-y-8 pb-10"
                >
                    {/* Size Settings */}
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                            <RiFullscreenLine size={16} className="text-brand-600" />
                            Core Dimensions
                        </div>
                        <button 
                          onClick={() => setLockAspectRatio(!lockAspectRatio)}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold transition-all ${lockAspectRatio ? 'bg-brand-50 text-brand-600 border border-brand-100' : 'bg-slate-50 text-slate-400 border border-slate-100 uppercase'}`}
                        >
                          {lockAspectRatio ? <RiCheckLine size={12} strokeWidth={3} /> : <RiSeparator size={12} />}
                          Lock Ratio
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5 group">
                              <label className="text-[10px] font-bold text-slate-500 uppercase ml-0.5 group-focus-within:text-brand-600 transition-colors">Width</label>
                              <div className="relative">
                                <input 
                                    type="number" 
                                    value={width} 
                                    onChange={(e) => handleWidthChange(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white outline-none transition-all pr-12"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">PX</span>
                              </div>
                          </div>
                          <div className="space-y-1.5 group">
                              <label className="text-[10px] font-bold text-slate-500 uppercase ml-0.5 group-focus-within:text-brand-600 transition-colors">Height</label>
                              <div className="relative">
                                <input 
                                    type="number" 
                                    value={height} 
                                    onChange={(e) => handleHeightChange(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white outline-none transition-all pr-12"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">PX</span>
                              </div>
                          </div>
                      </div>
                      <p className="text-[9px] text-slate-400 bg-slate-100 p-2.5 rounded-lg border border-slate-200/50 font-medium italic">
                        Processing {files.length} active image(s).
                      </p>
                    </div>

                    {/* Presets */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                            <RiStackLine size={16} className="text-brand-600" />
                            Standard Presets
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {PRESETS.map((p, i) => (
                                <button 
                                    key={i}
                                    onClick={() => applyPreset(p)}
                                    className="flex items-center justify-between p-3.5 bg-white border border-slate-200/60 rounded-xl hover:border-brand-400 hover:bg-brand-50/50 transition-all text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-brand-100 group-hover:text-brand-600 flex items-center justify-center transition-colors">
                                          {React.cloneElement(p.icon, { size: 16 })}
                                        </div>
                                        <div>
                                          <p className="text-xs font-bold text-slate-700 group-hover:text-slate-900">{p.name}</p>
                                          <p className="text-[10px] font-medium text-slate-400">{p.width} × {p.height}</p>
                                        </div>
                                    </div>
                                    <RiArrowRightSLine size={16} className="text-slate-300 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Export Configuration */}
                    <div className="pt-6 border-t border-slate-100 flex flex-col gap-5">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                          <RiFlashlightLine size={16} className="text-brand-600" />
                          Output Config
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase ml-0.5">Format</label>
                              <select 
                                  value={format} 
                                  onChange={(e) => setFormat(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-[11px] font-bold focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none appearance-none cursor-pointer hover:border-brand-300 transition-colors"
                              >
                                  <option value="image/jpeg">JPEG</option>
                                  <option value="image/png">PNG</option>
                                  <option value="image/webp">WEBP</option>
                              </select>
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase ml-0.5">Quality: {quality}%</label>
                              <div className="mt-2.5">
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="100" 
                                    value={quality} 
                                    onChange={(e) => setQuality(e.target.value)}
                                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                                />
                              </div>
                          </div>
                      </div>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-5 bg-white border-t border-slate-100 sticky bottom-0 z-10 flex flex-col gap-3">
            <button 
                onClick={downloadSingle}
                disabled={!activeFile || isBatching}
                className="group w-full py-3 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-300 text-slate-600 rounded-2xl font-bold flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
            >
                <RiDownload2Line size={16} />
                <span className="text-[12px]">Save Selected</span>
            </button>
            
            <button 
                onClick={downloadAll}
                disabled={files.length < 1 || isBatching}
                className={`group w-full py-4 relative overflow-hidden bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${isBatching ? 'cursor-wait' : ''}`}
            >
                {isBatching ? (
                  <>
                    <RiLoader4Line size={20} className="animate-spin" />
                    <span className="text-[13px] tracking-wide uppercase font-black">Processing {batchProgress}%</span>
                    <div 
                      className="absolute bottom-0 left-0 h-1 bg-white/20 transition-all duration-300"
                      style={{ width: `${batchProgress}%` }}
                    />
                  </>
                ) : (
                  <>
                    <RiInboxArchiveLine size={20} className="group-hover:-translate-y-1 transition-transform" />
                    <span className="text-[13px] tracking-wide uppercase font-black">Export All ({files.length})</span>
                  </>
                )}
            </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top Navbar */}
        <nav className="h-16 bg-white border-b border-slate-200/60 px-6 flex items-center justify-between z-20 backdrop-blur-md bg-white/80">
            <div className="flex items-center gap-6">
                {activeFile && (
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold text-slate-800 truncate max-w-[300px]">{activeFile.file.name}</span>
                        <div className="px-2 py-0.5 bg-brand-50 rounded-md text-[9px] font-black text-brand-600 uppercase tracking-wide border border-brand-100">
                            Active Slot
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-8">
                <div className="flex gap-6 items-center">
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Workspace</span>
                      <span className="text-xs font-black text-slate-900">{files.length} Photo(s)</span>
                    </div>
                </div>
            </div>
        </nav>

        {/* Canvas Area */}
        <div 
            className={`flex-1 flex items-center justify-center p-8 transition-all duration-300 overflow-auto relative ${isDragging ? 'bg-brand-50/50' : 'bg-[#fcfdfe]'}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files) }}
        >
            <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#2563eb 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}></div>

            <div className="relative group max-w-full z-10 flex flex-col items-center">
                <AnimatePresence>
                    {!activeFile && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key="empty-workspace"
                            className="bg-white p-14 rounded-[2.5rem] border border-slate-200/80 text-center space-y-6 max-w-md mx-6"
                        >
                            <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center mx-auto text-brand-600 border border-brand-100">
                                <RiInboxArchiveLine size={36} />
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-3xl font-display font-black text-slate-900 leading-tight">Upload Photos</h3>
                                <p className="text-slate-500 text-sm leading-relaxed px-6">
                                  Professional Image Resizer. Select a single photo or multiple files to begin high-quality processing.
                                </p>
                            </div>
                            <button 
                                onClick={() => fileInputRef.current.click()}
                                className="w-full px-8 py-4 bg-brand-600 text-white rounded-2xl font-bold font-black hover:bg-brand-700 transition-all active:scale-[0.98] tracking-wide"
                            >
                                Drag or Browse Images
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {activeFile && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key="active-canvas"
                        className="relative p-6 bg-white border border-slate-200/80 rounded-3xl ring-1 ring-slate-100"
                    >
                        <div className="relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50/50">
                            <canvas 
                                ref={canvasRef} 
                                className="max-w-full max-h-[60vh] block"
                            />
                        </div>
                        
                        <div className="mt-5 flex items-center justify-between border-t border-slate-50 pt-4 px-1">
                          <div className="flex gap-6">
                             <div className="flex flex-col">
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Output target</span>
                               <span className="text-sm font-black text-slate-800">{width}×{height}</span>
                             </div>
                             <div className="flex flex-col">
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Original info</span>
                               <span className="text-sm font-bold text-slate-500">{activeFile.img.width}×{activeFile.img.height} {activeFile.file.name.split('.').pop().toUpperCase()}</span>
                             </div>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Live Preview</span>
                          </div>
                        </div>
                    </motion.div>
                )}
            </div>
            
            <input type="file" ref={fileInputRef} hidden multiple onChange={(e) => handleFiles(e.target.files)} />
        </div>

        {/* Bottom Carousel (Batch) */}
        <div className="h-32 bg-white border-t border-slate-100 p-4 flex gap-4 overflow-x-auto items-center scrollbar-hide shrink-0 z-30">
            <button 
                onClick={() => fileInputRef.current.click()}
                className="w-22 h-22 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:text-brand-600 hover:border-brand-400 hover:bg-brand-50/50 transition-all shrink-0 active:scale-95 group/add"
            >
                <RiAddLine size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                <span className="text-[9px] font-black mt-2 uppercase tracking-widest">Add Files</span>
            </button>
            <AnimatePresence>
                {files.map((f, i) => (
                    <motion.div 
                        key={f.id}
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`relative w-22 h-22 rounded-2xl overflow-hidden cursor-pointer border-2 transition-all group shrink-0 ${currentIndex === i ? 'border-brand-600 ring-4 ring-brand-500/10' : 'border-slate-100 hover:border-slate-200'}`}
                        onClick={() => setCurrentIndex(i)}
                    >
                        <img src={f.url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                            <p className="text-[8px] text-white font-bold truncate tracking-tight">{f.file.name}</p>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); removeFile(f.id) }}
                            className="absolute top-1 right-1 w-6 h-6 bg-white/90 backdrop-blur-sm rounded-lg text-slate-600 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-red-500 hover:text-white"
                        >
                            <RiCloseLine size={14} />
                        </button>
                        {currentIndex === i && (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-brand-600 rounded text-[7px] font-black text-white uppercase tracking-widest">Active</div>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

export default App
