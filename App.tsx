import React, { useState, useRef, useEffect } from 'react';
import { Camera, Sparkles, RefreshCcw, Scissors, ArrowRight, Check, Loader2, KeyRound, Languages, Download, X, Upload, ArrowLeft, ChevronRight, User, Palette } from 'lucide-react';
import { AppStep, GeneratedImage, Gender, HairColor, HairDescription } from './types';
import { validateFace, generateHairstyleImage, generateHairstyleDescription } from './services/geminiService';
import { Button } from './components/Button';
import { Steps } from './components/Steps';
import { translations, Language } from './translations';
import { twMerge } from 'tailwind-merge';
import JSZip from 'jszip';

// --- Constants ---
const STYLE_CATEGORIES = {
  male: [
    { id: 'short_clean', prompt: "Short clean cut, buzz cut or crew cut, very neat" },
    { id: 'short_textured', prompt: "Short textured hair, messy quiff or french crop" },
    { id: 'medium', prompt: "Medium length, pompadour or side part, gentleman style" },
    { id: 'long', prompt: "Long hair, man bun or shoulder length flow" }
  ],
  female: [
    { id: 'pixie', prompt: "Short pixie cut or very short chic style" },
    { id: 'bob', prompt: "Classic bob cut or long bob (lob), chin to shoulder length" },
    { id: 'medium_layer', prompt: "Medium length with layers, textured and voluminous" },
    { id: 'long_straight', prompt: "Long straight sleek hair" },
    { id: 'long_curly', prompt: "Long wavy or curly hair, romantic style" }
  ]
};

const HAIR_COLORS: { id: HairColor; colorCode: string; textColor?: string }[] = [
  { id: 'original', colorCode: 'linear-gradient(135deg, #f3f4f6 0%, #9ca3af 100%)', textColor: '#000' },
  { id: 'black', colorCode: '#000000' },
  { id: 'dark_brown', colorCode: '#3e2723' },
  { id: 'light_brown', colorCode: '#8d6e63' },
  { id: 'blonde', colorCode: '#fcd34d', textColor: '#000' },
  { id: 'red', colorCode: '#b91c1c' },
  { id: 'silver', colorCode: '#e5e7eb', textColor: '#000' },
  { id: 'fashion', colorCode: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', textColor: '#fff' },
];

const App: React.FC = () => {
  // Key Selection State
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [isCheckingKey, setIsCheckingKey] = useState<boolean>(true);

  // App State
  const [language, setLanguage] = useState<Language>('zh');
  const [step, setStep] = useState<AppStep>('upload');
  
  // "Upload" step sub-states for Mobile Wizard Flow
  // 0: Upload/Home, 1: Gender, 2: Style, 3: Color
  const [configStep, setConfigStep] = useState<number>(0); 

  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Selection State
  const [gender, setGender] = useState<Gender>('female');
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>([]);
  const [selectedHairColor, setSelectedHairColor] = useState<HairColor>('original');

  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  
  // Multi-selection support: Array of IDs
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  
  const [finalDescriptions, setFinalDescriptions] = useState<HairDescription[]>([]);
  
  // Loading States
  const [isValidating, setIsValidating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDescribing, setIsDescribing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[language];

  // --- Effects ---
  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(hasKey);
        } else {
          setHasApiKey(true); 
        }
      } catch (e) {
        console.error("Error checking API key:", e);
      } finally {
        setIsCheckingKey(false);
      }
    };
    checkKey();
  }, []);

  // Set default styles when gender changes
  useEffect(() => {
    // Only reset styles if we don't have enough selected for the new gender
    // or if purely switching gender logic
    if (gender === 'male' && !selectedStyleIds.some(id => STYLE_CATEGORIES.male.map(s=>s.id).includes(id))) {
      setSelectedStyleIds(['short_clean', 'short_textured']);
    } else if (gender === 'female' && !selectedStyleIds.some(id => STYLE_CATEGORIES.female.map(s=>s.id).includes(id))) {
      setSelectedStyleIds(['bob', 'long_curly']);
    }
  }, [gender]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // --- Handlers ---

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'zh' ? 'en' : 'zh');
  };

  const handleConnectApiKey = async () => {
    try {
      if (window.aistudio) {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
      }
    } catch (e) {
      console.error("Error selecting key:", e);
    }
  };

  const handleStyleToggle = (id: string) => {
    setSelectedStyleIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(s => s !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleBack = () => {
    if (step === 'selection') {
      setStep('upload');
      setConfigStep(0); // Reset wizard
    } else if (step === 'result') {
      setStep('selection');
      setFinalDescriptions([]);
    } else if (step === 'upload') {
      // Wizard Back Logic
      if (configStep > 0) {
        setConfigStep(prev => prev - 1);
      }
    }
  };

  const handleNextConfigStep = () => {
    if (configStep < 3) {
      setConfigStep(prev => prev + 1);
    } else {
      handleStartGeneration();
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setValidationError("Cannot access camera. Please upload a file.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg');
        setOriginalImage(base64);
        setValidationError(null);
        stopCamera();
        validateUploadedImage(base64);
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setValidationError(t.errorTooLarge);
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setOriginalImage(base64);
      setValidationError(null);
      await validateUploadedImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const validateUploadedImage = async (base64: string) => {
    setIsValidating(true);
    setStep('validating');
    
    try {
      const result = await validateFace(base64);
      if (result.isValid) {
        setStep('upload');
        // Auto-advance to gender selection on successful upload
        setConfigStep(1); 
      } else {
        setValidationError(result.reason || t.errorInvalid);
        setOriginalImage(null);
        setStep('upload');
        setConfigStep(0);
      }
    } catch (e) {
      console.error(e);
      setValidationError(t.errorValidation);
      setStep('upload');
      setConfigStep(0);
    } finally {
      setIsValidating(false);
    }
  };

  const handleStartGeneration = async () => {
    if (!originalImage) return;
    if (selectedStyleIds.length < 2) {
      setValidationError(t.errorMinStyles);
      return;
    }

    setStep('generating');
    setIsGenerating(true);
    setGeneratedImages([]);
    setValidationError(null);

    const categoryList = STYLE_CATEGORIES[gender];
    const numberOfVariations = 6; 
    const promises = [];

    for (let i = 0; i < numberOfVariations; i++) {
      const styleIdToUse = selectedStyleIds[i % selectedStyleIds.length];
      const selectedCategory = categoryList.find(c => c.id === styleIdToUse) || categoryList[0];
      const basePrompt = selectedCategory.prompt;

      promises.push(
        generateHairstyleImage(originalImage, gender, basePrompt, selectedHairColor, i)
          .then(url => ({ 
            id: `gen-${Date.now()}-${i}`, 
            url, 
            promptUsed: basePrompt 
          }))
      );
    }

    try {
      const results = await Promise.all(promises);
      const validResults = results.filter(r => r.url !== null) as GeneratedImage[];
      
      if (validResults.length === 0) {
        throw new Error("No images generated successfully.");
      }

      setGeneratedImages(validResults);
      setSelectedImageIds([]); // Reset selection
      setStep('selection');
    } catch (e: any) {
      console.error(e);
      const errorMessage = e?.message || '';
      if (errorMessage.includes('403') || errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('Requested entity was not found')) {
         setValidationError(t.errorPermission);
         setHasApiKey(false);
      } else {
         setValidationError(t.errorGeneric);
      }
      setStep('upload');
      setConfigStep(0);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectImage = (id: string) => {
    setSelectedImageIds(prev => {
      // Allow toggle
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      // Limit selection to 3 for UI sanity (optional, but good for "card" size)
      if (prev.length >= 3) {
        return prev; 
      }
      return [...prev, id];
    });
  };

  const handleConfirmSelection = async () => {
    if (selectedImageIds.length === 0) return;
    
    // Get full objects
    const selectedImages = generatedImages.filter(img => selectedImageIds.includes(img.id));
    if (selectedImages.length === 0) return;

    setStep('describing');
    setIsDescribing(true);

    try {
      const results = await generateHairstyleDescription(selectedImages, language);
      setFinalDescriptions(results);
      setStep('result');
    } catch (e) {
      console.error(e);
      // Fallback handled in service, but if catastrophic:
      setFinalDescriptions([]);
      setStep('result');
    } finally {
      setIsDescribing(false);
    }
  };

  const handleRestart = () => {
    setStep('upload');
    setConfigStep(0);
    setOriginalImage(null);
    setGeneratedImages([]);
    setSelectedImageIds([]);
    setFinalDescriptions([]);
    setValidationError(null);
  };

  // --- Components for Sections ---

  const GenderSection = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {['male', 'female'].map((g) => (
          <button
            key={g}
            onClick={() => setGender(g as Gender)}
            className={`py-6 px-4 rounded-xl flex flex-col items-center justify-center font-bold text-lg transition-all duration-300 ${
              gender === g
                ? 'bg-gold-400 text-black shadow-[0_0_20px_rgba(251,191,36,0.4)]' 
                : 'bg-white/5 text-neutral-400 hover:text-gold-400 border border-white/10'
            }`}
          >
            <User className={`w-8 h-8 mb-2 ${gender === g ? 'text-black' : 'text-neutral-500'}`} />
            {g === 'male' ? t.genderMale : t.genderFemale}
          </button>
        ))}
      </div>
    </div>
  );

  const StyleSection = () => (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-2">
         <span className={`text-xs px-2 py-1 rounded border ${selectedStyleIds.length < 2 ? 'border-red-500/50 text-red-400' : 'border-green-500/50 text-green-400'}`}>
           {selectedStyleIds.length} selected
         </span>
      </div>
      <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2">
        {STYLE_CATEGORIES[gender].map((style) => {
          const isSelected = selectedStyleIds.includes(style.id);
          return (
            <button
              key={style.id}
              onClick={() => handleStyleToggle(style.id)}
              className={`relative p-4 rounded-xl text-left flex items-center justify-between group transition-all duration-300 ${
                isSelected
                  ? 'bg-gold-400/10 border border-gold-400 text-gold-400 shadow-[0_0_15px_rgba(251,191,36,0.1)]' 
                  : 'bg-white/5 border border-white/10 text-neutral-400 hover:bg-white/10'
              }`}
            >
              <span className="font-medium text-sm">{(t.styleOptions[gender] as any)[style.id]}</span>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${isSelected ? 'bg-gold-400 border-gold-400 text-black' : 'border-neutral-600 text-transparent'}`}>
                 <Check className="w-3 h-3" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const ColorSection = () => (
    <div className="grid grid-cols-4 gap-4 justify-items-center py-4">
      {HAIR_COLORS.map((color) => {
        const isSelected = selectedHairColor === color.id;
        return (
          <button
            key={color.id}
            onClick={() => setSelectedHairColor(color.id)}
            className="group relative flex flex-col items-center gap-2"
          >
            <div 
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                isSelected ? 'ring-2 ring-gold-400 scale-110 shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'ring-1 ring-white/10 hover:scale-105'
              }`}
              style={{ background: color.colorCode }}
            >
              {isSelected && <Check className="w-5 h-5 drop-shadow-md" style={{ color: color.textColor || 'white' }} />}
            </div>
            <span className={`text-[10px] font-medium text-center transition-colors ${isSelected ? 'text-gold-400' : 'text-neutral-500'}`}>
               {(t.colorOptions as any)[color.id]}
            </span>
          </button>
        );
      })}
    </div>
  );

  // --- Render Steps ---

  const renderConfigStep = () => {
    // Dynamic Button Text based on step
    let buttonText = t.nextBtn;
    if (configStep === 3) buttonText = t.generateBtn;
    
    // Mobile View: Wizard Step by Step
    return (
      <div className="flex flex-col h-full">
        {/* Mobile Header for Wizard */}
        <div className="md:hidden mb-6 flex items-center justify-between">
            {configStep > 0 ? (
               <button onClick={handleBack} className="p-2 bg-white/5 rounded-full text-white hover:bg-white/10">
                 <ArrowLeft className="w-5 h-5" />
               </button>
            ) : <div className="w-9"/>}
            <span className="font-serif text-xl text-gold-400 tracking-wider">
               {configStep === 0 ? "" : 
                configStep === 1 ? t.genderLabel.split('.')[1] :
                configStep === 2 ? t.styleLabel.split('.')[1] :
                t.colorLabel.split('.')[1]}
            </span>
            <div className="w-9" />
        </div>

        {/* Dynamic Content based on configStep */}
        <div className="flex-1 overflow-y-auto px-1 md:hidden">
           {configStep === 0 && (
              /* This case shouldn't happen due to auto-advance, but fallback */
              <div className="text-center text-neutral-400">Image Uploaded.</div>
           )}
           {configStep === 1 && <GenderSection />}
           {configStep === 2 && <StyleSection />}
           {configStep === 3 && <ColorSection />}
        </div>

        {/* Mobile Footer Actions */}
        <div className="mt-auto pt-6 md:hidden">
          <Button 
             className="w-full py-4 text-base" 
             onClick={handleNextConfigStep}
             disabled={configStep === 2 && selectedStyleIds.length < 2}
             variant="primary"
          >
             {buttonText}
          </Button>
        </div>

        {/* Desktop View: Dashboard (All in one column) */}
        <div className="hidden md:flex flex-col gap-8 h-full overflow-y-auto pr-2 custom-scrollbar">
           <div>
             <label className="text-xs font-bold text-gold-400 uppercase tracking-widest mb-3 block">1. {t.genderLabel.split('. ')[1]}</label>
             <GenderSection />
           </div>
           
           <div>
             <label className="text-xs font-bold text-gold-400 uppercase tracking-widest mb-3 block">2. {t.styleLabel.split('. ')[1]}</label>
             <StyleSection />
           </div>
           
           <div>
             <label className="text-xs font-bold text-gold-400 uppercase tracking-widest mb-3 block">3. {t.colorLabel.split('. ')[1]}</label>
             <ColorSection />
           </div>

           <Button 
             className="w-full py-5 text-lg mt-4" 
             onClick={handleStartGeneration}
             disabled={selectedStyleIds.length < 2}
             icon={<Sparkles className="w-5 h-5" />}
           >
             {t.generateBtn}
           </Button>
        </div>
      </div>
    );
  };

  const renderUploadStep = () => (
    <div className="h-full flex flex-col relative z-10 animate-fade-in">
      {!originalImage ? (
        // --- LANDING / UPLOAD STATE ---
        <div className="flex flex-col items-center justify-center flex-1 text-center space-y-8 py-10">
          <div className="space-y-4 max-w-lg mx-auto">
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-white tracking-tight">
              <span className="text-gold-400">Style</span>Snap
            </h1>
            <p className="text-neutral-400 text-lg md:text-xl font-light leading-relaxed">
              {t.heroSubtitle}
            </p>
          </div>

          <div className="w-full max-w-md glass-panel p-1 rounded-3xl mt-8">
             <div className="flex gap-2 p-2">
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  variant="secondary"
                  className="flex-1 py-6 text-base"
                  icon={<Upload className="w-5 h-5" />}
                >
                  {t.btnUpload}
                </Button>
                <Button 
                  onClick={startCamera} 
                  variant="primary"
                  className="flex-1 py-6 text-base"
                  icon={<Camera className="w-5 h-5" />}
                >
                  {t.btnCamera}
                </Button>
             </div>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="image/*" 
            className="hidden" 
          />
           
           {/* Validation/Error Toasts */}
           {(validationError || isValidating) && (
              <div className="absolute top-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto md:min-w-[300px]">
                {validationError && (
                  <div className="p-4 bg-red-900/80 backdrop-blur-md border border-red-800 text-red-200 text-sm rounded-xl flex items-center justify-center shadow-lg">
                    <span className="mr-2">⚠️</span> {validationError}
                  </div>
                )}
                {isValidating && (
                  <div className="p-4 bg-gold-900/80 backdrop-blur-md border border-gold-800 text-gold-200 text-sm rounded-xl flex items-center justify-center shadow-lg">
                    <Loader2 className="w-4 h-4 mr-3 animate-spin" /> {t.validating}
                  </div>
                )}
              </div>
           )}
        </div>
      ) : (
        // --- CONFIGURE STATE (Split layout for desktop, Wizard for mobile) ---
        <div className="flex-1 w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-8 items-stretch h-[calc(100vh-140px)]">
           {/* Left Column: Image Preview */}
           <div className="md:w-1/2 flex flex-col">
              <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 group flex-shrink-0 max-h-[40vh] md:max-h-full h-full md:h-auto">
                <img src={originalImage} alt="Uploaded" className="w-full h-full object-cover" />
                <div className="absolute top-4 left-4">
                  <button 
                     onClick={() => { setOriginalImage(null); setConfigStep(0); }}
                     className="bg-black/50 backdrop-blur-md text-white p-2 rounded-full hover:bg-red-500/80 transition-colors border border-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="hidden md:block mt-6 text-center">
                 <h2 className="text-2xl font-serif text-white mb-2">{t.heroTitle}</h2>
                 <p className="text-neutral-500 text-sm">{t.uploadSubtitle}</p>
              </div>
           </div>

           {/* Right Column: Configuration */}
           <div className="md:w-1/2 glass-panel rounded-[2.5rem] p-6 md:p-8 flex flex-col bg-black/80 backdrop-blur-xl">
              {renderConfigStep()}
           </div>
        </div>
      )}
    </div>
  );

  const renderCameraModal = () => {
    if (!isCameraOpen) return null;
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4 animate-fade-in">
         <div className="relative w-full max-w-lg bg-black rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-white/10">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full aspect-square object-cover transform -scale-x-100" 
            />
            <button 
              onClick={stopCamera}
              className="absolute top-6 right-6 bg-black/50 text-white p-3 rounded-full hover:bg-white/20 backdrop-blur-md transition-all border border-white/10"
            >
              <X className="w-6 h-6" />
            </button>
         </div>
         <div className="mt-10 flex gap-6">
            <button 
              onClick={capturePhoto}
              className="w-20 h-20 bg-white rounded-full border-4 border-gray-800 hover:scale-105 transition-all flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)]"
            >
              <div className="w-16 h-16 bg-white rounded-full border-2 border-black" />
            </button>
         </div>
         <p className="text-neutral-400 mt-6 font-medium tracking-wide opacity-80 text-lg">{t.capture}</p>
      </div>
    );
  };

  const renderGeneratingStep = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-12 text-center animate-fade-in">
      <div className="relative">
        <div className="w-32 h-32 border-[3px] border-white/5 border-t-gold-400 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 bg-gold-400/10 backdrop-blur-md rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.2)]">
             <Sparkles className="w-10 h-10 text-gold-400 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="glass-panel px-10 py-8 rounded-3xl max-w-md border-gold-400/20">
        <h2 className="text-3xl font-serif text-white mb-3">{t.generatingTitle}</h2>
        <p className="text-neutral-400 font-medium">{t.generatingSubtitle}</p>
      </div>
    </div>
  );

  const renderSelectionStep = () => (
    <>
      <div className="flex flex-col h-full animate-fade-in relative z-10 pb-32">
        <div className="mb-6 flex items-center justify-between">
          <button 
            onClick={handleBack} 
            className="flex items-center text-neutral-400 hover:text-white transition-colors font-medium text-sm bg-white/5 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.backBtn}
          </button>
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-serif text-gold-400">{t.selectTitle}</h2>
            <span className="text-xs text-neutral-500 mt-1">{selectedImageIds.length} / 3 selected</span>
          </div>
          <div className="w-10"></div> 
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 auto-rows-fr">
          {generatedImages.map((img) => (
            <div 
              key={img.id}
              onClick={() => handleSelectImage(img.id)}
              className={`relative group cursor-pointer rounded-2xl overflow-hidden aspect-[4/5] transition-all duration-300 ${
                selectedImageIds.includes(img.id)
                  ? 'ring-2 ring-gold-400 shadow-[0_0_30px_rgba(251,191,36,0.3)] scale-[0.98] z-10 grayscale-0' 
                  : 'hover:scale-[1.02] opacity-80 hover:opacity-100 hover:grayscale-0 grayscale-[0.3]'
              }`}
            >
              <img 
                src={img.url} 
                alt="Hairstyle option" 
                className="w-full h-full object-cover"
              />
              {selectedImageIds.includes(img.id) && (
                <div className="absolute top-3 right-3 bg-gold-400 text-black rounded-full p-1.5 shadow-lg animate-fade-in">
                  <Check className="w-4 h-4" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <span className="text-white text-xs font-bold tracking-wider uppercase border-b border-gold-400 pb-1">Select</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fixed Footer Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-fade-in">
        <div className="bg-black/80 backdrop-blur-xl border-t border-white/10 p-4 md:p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
           <div className="max-w-6xl mx-auto flex gap-4">
              <Button variant="ghost" onClick={handleStartGeneration} icon={<RefreshCcw className="w-4 h-4"/>} className="flex-1">
                {t.regenerateBtn}
              </Button>
              <Button 
                disabled={selectedImageIds.length === 0} 
                onClick={handleConfirmSelection}
                icon={<ArrowRight className="w-4 h-4"/>}
                className="flex-[2]"
              >
                {t.confirmBtn} ({selectedImageIds.length})
              </Button>
           </div>
        </div>
      </div>
    </>
  );

  const renderDescribingStep = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 text-center animate-fade-in">
      <div className="w-20 h-20 bg-white/5 backdrop-blur-xl rounded-2xl flex items-center justify-center animate-bounce shadow-2xl border border-gold-400/30">
        <Scissors className="w-8 h-8 text-gold-400" />
      </div>
      <div className="glass-panel px-8 py-6 rounded-2xl max-w-md border-white/5">
        <h2 className="text-2xl font-serif text-white mb-2">{t.analyzingTitle}</h2>
        <p className="text-neutral-500 font-medium text-sm">{t.analyzingSubtitle}</p>
      </div>
    </div>
  );

  const renderResultStep = () => {
    if (finalDescriptions.length === 0) return null;

    // --- Dynamic Card Generator (Single or Multi) ---
    const handleDownload = async () => {
        setIsDownloading(true);
        const width = 1200;
        const padding = 80;
        
        // Define Fonts
        const headerFont = 'bold 50px "Playfair Display", serif';
        const titleFont = 'bold 70px "Playfair Display", serif';
        const sectionFont = 'bold 36px "Plus Jakarta Sans", sans-serif';
        const contentFont = '32px "Plus Jakarta Sans", sans-serif';
        const footerFont = '24px "Plus Jakarta Sans", sans-serif';

        const isZh = language === 'zh';
        const contentLineHeight = 50;
        const sectionSpacing = 60;
        const maxWidth = width - (padding * 2);

        // Helper to create a single card blob
        const createCardBlob = async (desc: HairDescription, idx: number): Promise<{blob: Blob, name: string} | null> => {
          const selectedImg = generatedImages.find(img => img.id === desc.imageId);
          if (!selectedImg) return null;

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return null;

          // --- 1. Calculate Height ---
          let currentHeight = padding + 140; // Header + Margin
          const imgSize = width - (padding * 2);
          
          currentHeight += imgSize + 80; // Image + space
          currentHeight += 100 + 50; // Title + space

          for (const section of desc.sections) {
             currentHeight += 50; // Heading
             
             ctx.font = contentFont; 

             const tokens = isZh ? section.content.split('') : section.content.split(' ');
             let line = '';
             let lines = 1;
             for (let n = 0; n < tokens.length; n++) {
                const token = tokens[n];
                const testLine = line + token + (!isZh ? ' ' : '');
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && n > 0) {
                   line = token + (!isZh ? ' ' : '');
                   lines++;
                } else {
                   line = testLine;
                }
             }
             currentHeight += (lines * contentLineHeight) + sectionSpacing;
          }
          
          currentHeight += 100; // Footer area

          // --- 2. Render ---
          canvas.width = width;
          canvas.height = currentHeight;

          // Re-get context after resize
          const renderCtx = canvas.getContext('2d'); 
          if (!renderCtx) return null;

          // Background
          renderCtx.fillStyle = '#050505';
          renderCtx.fillRect(0, 0, width, currentHeight);

          // Header
          renderCtx.fillStyle = '#fbbf24'; // Gold
          renderCtx.font = headerFont;
          renderCtx.fillText('StyleSnap AI Consultation', padding, padding + 40);

          let drawY = padding + 140;

          // Image
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = selectedImg.url;
          await new Promise((resolve) => { img.onload = resolve; });

          // Gold Border
          renderCtx.strokeStyle = '#fbbf24';
          renderCtx.lineWidth = 4;
          renderCtx.strokeRect(padding - 2, drawY - 2, imgSize + 4, imgSize + 4);

          renderCtx.drawImage(img, padding, drawY, imgSize, imgSize);
          drawY += imgSize + 80;

          // Title
          renderCtx.fillStyle = '#ffffff'; 
          renderCtx.font = titleFont;
          renderCtx.fillText(desc.title, padding, drawY);
          drawY += 100;

          // Sections
          for (const section of desc.sections) {
             // Heading (Gold)
             renderCtx.fillStyle = '#fbbf24';
             renderCtx.font = sectionFont;
             renderCtx.fillText(section.heading, padding, drawY);
             drawY += 50;

             // Content (Gray)
             renderCtx.fillStyle = '#d4d4d4';
             renderCtx.font = contentFont;
             
             const tokens = isZh ? section.content.split('') : section.content.split(' ');
             let line = '';
             for (let n = 0; n < tokens.length; n++) {
               const token = tokens[n];
               const testLine = line + token + (!isZh ? ' ' : '');
               const metrics = renderCtx.measureText(testLine);
               if (metrics.width > maxWidth && n > 0) {
                 renderCtx.fillText(line, padding, drawY);
                 line = token + (!isZh ? ' ' : '');
                 drawY += contentLineHeight;
               } else {
                 line = testLine;
               }
             }
             renderCtx.fillText(line, padding, drawY);
             drawY += sectionSpacing;
          }

          // Footer
          renderCtx.fillStyle = '#555555'; 
          renderCtx.font = footerFont;
          renderCtx.fillText('Generated by StyleSnap AI', padding, currentHeight - 40);

          return new Promise((resolve) => {
             canvas.toBlob((blob) => {
                if(blob) {
                    const safeTitle = desc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    resolve({ blob, name: `stylesnap_${safeTitle}_${idx+1}.png` });
                } else {
                    resolve(null);
                }
             }, 'image/png');
          });
        };

        try {
          if (finalDescriptions.length === 1) {
            // Single Download
            const result = await createCardBlob(finalDescriptions[0], 0);
            if (result) {
               const url = URL.createObjectURL(result.blob);
               const link = document.createElement('a');
               link.href = url;
               link.download = result.name;
               link.click();
               URL.revokeObjectURL(url);
            }
          } else {
            // ZIP Download
            const zip = new JSZip();
            const promises = finalDescriptions.map((desc, i) => createCardBlob(desc, i));
            const results = await Promise.all(promises);
            
            let count = 0;
            results.forEach(res => {
               if (res) {
                   zip.file(res.name, res.blob);
                   count++;
               }
            });

            if (count > 0) {
              const zipContent = await zip.generateAsync({ type: 'blob' });
              const url = URL.createObjectURL(zipContent);
              const link = document.createElement('a');
              link.href = url;
              link.download = `stylesnap_collection_${Date.now()}.zip`;
              link.click();
              URL.revokeObjectURL(url);
            }
          }
        } catch (e) {
          console.error("Download failed:", e);
        } finally {
          setIsDownloading(false);
        }
    };

    return (
      <div className="animate-fade-in max-w-6xl mx-auto pb-10 h-full">
        <div className="mb-6">
          <button 
            onClick={handleBack} 
            className="flex items-center text-neutral-400 hover:text-white transition-colors font-bold text-sm bg-white/5 px-4 py-2 rounded-full backdrop-blur-md border border-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.backBtn}
          </button>
        </div>

        {/* --- Result Stack --- */}
        <div className="flex flex-col gap-10">
           {finalDescriptions.map((desc, idx) => {
              const selectedImg = generatedImages.find(img => img.id === desc.imageId);
              if (!selectedImg) return null;

              return (
                <div key={idx} className="glass-panel rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row border border-white/10 bg-black/40">
                  {/* Image Side */}
                  <div className="lg:w-5/12 relative h-[500px] lg:h-auto group overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10">
                    <img src={selectedImg.url} alt="Final Look" className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                    <div className="absolute top-6 left-6">
                       <div className="bg-gold-400 text-black px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                          Option {idx + 1}
                       </div>
                    </div>
                  </div>

                  {/* Content Side */}
                  <div className="lg:w-7/12 p-8 lg:p-14 flex flex-col justify-between">
                    <div className="h-full">
                      <div className="inline-flex items-center space-x-2 text-gold-400 mb-6 bg-gold-400/10 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase backdrop-blur-sm border border-gold-400/20">
                        <Scissors className="w-3.5 h-3.5" />
                        <span>Consultation Card</span>
                      </div>
                      
                      <h1 className="text-3xl lg:text-4xl font-serif font-bold text-white mb-8 leading-tight">{desc.title}</h1>
                      
                      <div className="space-y-6">
                        {desc.sections.map((section, sIdx) => (
                          <div key={sIdx} className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/5 hover:bg-white/10 transition-colors">
                            <h3 className="text-gold-400 font-bold text-base mb-2 flex items-center">
                              <span className="w-1.5 h-1.5 bg-gold-400 rounded-full mr-2"></span>
                              {section.heading}
                            </h3>
                            <p className="text-neutral-300 text-sm leading-relaxed pl-3.5 border-l border-white/10">
                              {section.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
           })}
        </div>
        
        {/* Footer Actions */}
        <div className="glass-panel mt-8 p-6 rounded-3xl sticky bottom-4 z-40 bg-black/80 backdrop-blur-xl border-gold-400/20 flex flex-col sm:flex-row gap-4">
           <Button 
             className="flex-1 py-4 text-base" 
             onClick={handleDownload} 
             disabled={isDownloading}
             icon={isDownloading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-5 h-5"/>}
           >
              {isDownloading ? 'Processing...' : `${t.downloadCardBtn} (${finalDescriptions.length})`}
           </Button>
           <Button variant="outline" className="flex-1 py-4" onClick={handleRestart}>
              {t.startOverBtn}
           </Button>
        </div>
      </div>
    );
  };

  if (isCheckingKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <Loader2 className="w-12 h-12 animate-spin text-gold-400" />
      </div>
    );
  }

  if (!hasApiKey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in relative">
        <div className="glass-panel p-12 rounded-[2.5rem] shadow-2xl max-w-md w-full relative overflow-hidden bg-black/60 border-white/10">
           <div className="w-16 h-16 bg-gold-400/20 rounded-2xl flex items-center justify-center mb-8 mx-auto border border-gold-400/30">
             <KeyRound className="w-8 h-8 text-gold-400" />
           </div>
           
           <h1 className="text-3xl font-serif font-bold text-white mb-4 tracking-tight">API Key Required</h1>
           <p className="text-neutral-400 mb-10 leading-relaxed">
             {t.whyPaidKeyDesc}
           </p>
           
           <Button onClick={handleConnectApiKey} className="w-full text-base py-4" icon={<KeyRound className="w-4 h-4"/>}>
             {t.connectKey}
           </Button>

           <div className="mt-8 pt-6 border-t border-white/10">
             <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-sm text-neutral-500 hover:text-gold-400 transition-colors flex items-center justify-center gap-1 font-medium">
               {t.readDocs} <ArrowRight className="w-3 h-3"/>
             </a>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-gray-100 font-sans relative selection:bg-gold-400 selection:text-black">
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer group" onClick={handleRestart}>
            <div className="bg-gold-400 rounded-lg p-1.5 shadow-lg shadow-gold-400/20">
               <Sparkles className="w-4 h-4 text-black" />
            </div>
            <span className="text-lg font-serif font-bold tracking-tight text-white group-hover:text-gold-400 transition-colors">{t.appTitle}</span>
          </div>
          
          <button 
            onClick={toggleLanguage}
            className="flex items-center space-x-2 text-xs font-bold text-neutral-400 hover:text-white transition-all px-3 py-1.5 rounded-lg hover:bg-white/10 border border-transparent"
          >
            <Languages className="w-3 h-3" />
            <span>{language === 'zh' ? 'EN' : '中'}</span>
          </button>
        </div>
      </header>

      <main className="pt-24 pb-10 px-4 max-w-6xl mx-auto relative z-10 h-full min-h-[calc(100vh-6rem)]">
        {step !== 'upload' && step !== 'validating' && <Steps currentStep={step} />}
        
        {step === 'upload' && renderUploadStep()}
        {step === 'validating' && renderUploadStep()}
        {step === 'generating' && renderGeneratingStep()}
        {step === 'selection' && renderSelectionStep()}
        {step === 'describing' && renderDescribingStep()}
        {step === 'result' && renderResultStep()}
      </main>
      
      {renderCameraModal()}
    </div>
  );
}

export default App;