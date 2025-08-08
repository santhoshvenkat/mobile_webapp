
import React, { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Orientation, WeatherData, GroundingSource } from './types';
import { ICONS } from './constants';
import { fetchWeather } from './services/geminiService';

// --- Custom Hook for Orientation ---
const useOrientation = (): Orientation => {
  const getOrientation = useCallback((): Orientation => {
    if (typeof window === 'undefined' || !window.screen || !window.screen.orientation) {
      return 'unknown';
    }
    const { type } = window.screen.orientation;
    if (type.startsWith('portrait')) {
        return window.screen.orientation.angle === 0 ? 'portrait-primary' : 'portrait-secondary';
    }
    if (type.startsWith('landscape')) {
        return window.screen.orientation.angle === 90 ? 'landscape-primary' : 'landscape-secondary';
    }
    return 'unknown';
  }, []);

  const [orientation, setOrientation] = useState<Orientation>(getOrientation());

  useEffect(() => {
    const handleOrientationChange = () => setOrientation(getOrientation());
    
    if (window.screen.orientation) {
        window.screen.orientation.addEventListener('change', handleOrientationChange);
        return () => window.screen.orientation.removeEventListener('change', handleOrientationChange);
    }
    return () => {};
  }, [getOrientation]);

  return orientation;
};

// --- Reusable UI Components ---

const Icon = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-8 h-8 ${className}`}>
    {children}
  </svg>
);

const Card = ({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) => (
  <div className="w-full max-w-sm mx-auto bg-black/40 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/10">
    <div className="p-5 border-b border-white/10 flex items-center space-x-4">
      <div className="text-blue-400">{icon}</div>
      <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const Button = ({ onClick, children, className = '', disabled = false }: { onClick: () => void; children: ReactNode; className?: string; disabled?: boolean }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`px-6 py-3 rounded-xl font-semibold text-white transition-all duration-150 transform active:scale-95 disabled:bg-gray-600 disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
    >
        {children}
    </button>
);


// --- View Components ---

const InitialView = () => (
  <div className="flex flex-col items-center justify-center text-center p-8">
    <Icon className="w-24 h-24 text-blue-400 mb-6 animate-[spin_5s_linear_infinite]">{ICONS.ROTATE}</Icon>
    <h1 className="text-3xl font-bold mb-2">Orientation Sense</h1>
    <p className="text-lg text-gray-300">Rotate your device to discover different tools.</p>
  </div>
);

const AlarmView = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [alarmTime, setAlarmTime] = useState('');
    const [isAlarmSet, setIsAlarmSet] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    useEffect(() => {
        if (isAlarmSet && alarmTime) {
            const now = new Date();
            const [hours, minutes] = alarmTime.split(':');
            const alarmDate = new Date();
            alarmDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            if (now.getHours() === alarmDate.getHours() && now.getMinutes() === alarmDate.getMinutes() && now.getSeconds() === 0) {
                audioRef.current?.play();
                alert(`Alarm! It's ${alarmTime}`);
                setIsAlarmSet(false);
            }
        }
    }, [currentTime, isAlarmSet, alarmTime]);
    
    useEffect(() => {
       audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');
    }, []);

    return (
        <Card title="Alarm Clock" icon={<Icon>{ICONS.ALARM}</Icon>}>
            <div className="text-center">
                <p className="text-6xl font-mono font-bold text-white tracking-wider">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                <p className="text-lg text-gray-400">{currentTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="mt-8 flex flex-col items-center space-y-4">
                <input
                    type="time"
                    aria-label="Set alarm time"
                    value={alarmTime}
                    onChange={(e) => setAlarmTime(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded-lg p-3 text-white w-full max-w-xs text-center text-lg"
                    disabled={isAlarmSet}
                />
                <Button
                    onClick={() => setIsAlarmSet(!isAlarmSet)}
                    disabled={!alarmTime}
                    className={`w-full max-w-xs ${isAlarmSet ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                >
                    {isAlarmSet ? `Stop Alarm (${alarmTime})` : 'Set Alarm'}
                </Button>
            </div>
        </Card>
    );
};


const StopwatchView = () => {
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [laps, setLaps] = useState<number[]>([]);
    const timerRef = useRef<number | null>(null);

    const formatTime = (time: number) => {
        const minutes = Math.floor((time / 60000) % 60).toString().padStart(2, '0');
        const seconds = Math.floor((time / 1000) % 60).toString().padStart(2, '0');
        const milliseconds = (time % 1000).toString().padStart(3, '0').slice(0, 2);
        return `${minutes}:${seconds}.${milliseconds}`;
    };
    
    const start = () => {
        if (isRunning) return;
        setIsRunning(true);
        const startTime = Date.now() - time;
        timerRef.current = window.setInterval(() => {
            setTime(Date.now() - startTime);
        }, 10);
    };

    const stop = () => {
        setIsRunning(false);
        if(timerRef.current) clearInterval(timerRef.current);
    };

    const reset = () => {
        stop();
        setTime(0);
        setLaps([]);
    };

    const lap = () => {
        if (isRunning) {
            setLaps(prev => [time, ...prev]);
        }
    };
    
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    return (
        <Card title="Stopwatch" icon={<Icon>{ICONS.STOPWATCH}</Icon>}>
            <div className="text-center mb-6">
                <p className="text-7xl font-mono font-bold text-white tracking-tighter" aria-live="polite">{formatTime(time)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
                <Button onClick={isRunning ? stop : start} className={isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}>
                    {isRunning ? 'Stop' : 'Start'}
                </Button>
                <Button onClick={lap} disabled={!isRunning} className="bg-gray-600 hover:bg-gray-700">
                    Lap
                </Button>
            </div>
             <div className="text-center">
                <button onClick={reset} className="text-gray-400 hover:text-white transition-colors">Reset</button>
            </div>
            {laps.length > 0 && <div className="mt-4 max-h-36 overflow-y-auto space-y-2 pr-2">
                {laps.map((lapTime, index) => {
                    const prevLapTime = laps[index + 1] || 0;
                    return (
                        <div key={index} className="flex justify-between items-center bg-gray-800/50 p-2 rounded-md text-sm">
                            <span className="font-medium text-gray-400">Lap {laps.length - index}</span>
                            <span className="font-mono text-gray-300">{formatTime(lapTime - prevLapTime)}</span>
                            <span className="font-mono text-white">{formatTime(lapTime)}</span>
                        </div>
                    )
                })}
            </div>}
        </Card>
    );
};

const TimerView = () => {
    const [initialTime, setInitialTime] = useState(300); // 5 minutes
    const [timeLeft, setTimeLeft] = useState(initialTime);
    const [isRunning, setIsRunning] = useState(false);
    const timerRef = useRef<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
       audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm.ogg');
    }, []);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    const startTimer = useCallback(() => {
        if (timeLeft <= 0 || isRunning) return;
        setIsRunning(true);
        const endTime = Date.now() + timeLeft * 1000;
        timerRef.current = window.setInterval(() => {
            const newTimeLeft = Math.round((endTime - Date.now()) / 1000);
            if (newTimeLeft <= 0) {
                setTimeLeft(0);
                setIsRunning(false);
                if(timerRef.current) clearInterval(timerRef.current);
                audioRef.current?.play();
                alert("Time's up!");
            } else {
                setTimeLeft(newTimeLeft);
            }
        }, 1000);
    }, [timeLeft, isRunning]);

    const stopTimer = () => {
        setIsRunning(false);
        if(timerRef.current) clearInterval(timerRef.current);
    };

    const resetTimer = () => {
        stopTimer();
        setTimeLeft(initialTime);
    };
    
    const handleSetTime = (seconds: number) => {
        if(isRunning) return;
        setInitialTime(seconds);
        setTimeLeft(seconds);
    }
    
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    return (
        <Card title="Timer" icon={<Icon>{ICONS.TIMER}</Icon>}>
            <div className="text-center mb-6">
                 <p className="text-7xl font-mono font-bold text-white tracking-tighter" aria-live="polite">{formatTime(timeLeft)}</p>
            </div>
             <div className="flex justify-center space-x-2 mb-6">
                {[1, 5, 10, 15].map(min => (
                    <button key={min} onClick={() => handleSetTime(min * 60)} className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-full text-sm disabled:opacity-50 transition-all transform active:scale-95" disabled={isRunning}>
                        {min}m
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Button onClick={isRunning ? stopTimer : startTimer} className={isRunning ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'}>
                    {isRunning ? 'Pause' : 'Start'}
                </Button>
                 <Button onClick={resetTimer} className="bg-gray-600 hover:bg-gray-700">
                    Reset
                </Button>
            </div>
        </Card>
    );
};

const WeatherView = () => {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [sources, setSources] = useState<GroundingSource[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const getLocationAndWeather = useCallback(() => {
        setLoading(true);
        setError(null);
        setWeather(null);
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { weatherData, sources } = await fetchWeather(position.coords.latitude, position.coords.longitude);
                        setWeather(weatherData);
                        setSources(sources);
                    } catch (e: any) {
                        setError(e.message || 'An unknown error occurred.');
                         if (e.message.includes("API key")) {
                            setError("Weather service is disabled. API key not found.");
                        }
                    } finally {
                        setLoading(false);
                    }
                },
                (err: GeolocationPositionError) => {
                    setLoading(false);
                    switch (err.code) {
                        case err.PERMISSION_DENIED:
                            setError('Permission Denied. Please enable location access for this site in your browser settings, then try again.');
                            break;
                        case err.POSITION_UNAVAILABLE:
                            setError('Location information is unavailable. Please check your connection or try again later.');
                            break;
                        case err.TIMEOUT:
                            setError('The request to get user location timed out. Please try again.');
                            break;
                        default:
                            setError('An unknown error occurred while fetching your location.');
                            break;
                    }
                }
            );
        } else {
            setError('Geolocation is not supported by your browser.');
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        getLocationAndWeather();
    }, [getLocationAndWeather]);

    return (
        <Card title="Today's Weather" icon={<Icon>{ICONS.SUN}</Icon>}>
            {loading && <p className="text-center text-gray-400 animate-pulse">Fetching weather data...</p>}
            {error && <div className="text-center space-y-4">
                <p className="text-red-400">{error}</p>
                <Button onClick={getLocationAndWeather} className="bg-blue-500 hover:bg-blue-600 mx-auto">
                    Try Again
                </Button>
            </div>}
            {weather && !loading && (
                <div className="flex flex-col items-center text-center">
                    <h3 className="text-3xl font-bold">{weather.city}</h3>
                    <div className="text-8xl my-4 flex items-start">
                        <span className="mt-2">{weather.icon}</span>
                        <span className="ml-4 font-bold">{Math.round(weather.temperature)}°C</span>
                    </div>
                    <p className="text-2xl text-gray-300 capitalize">{weather.condition}</p>
                    <div className="mt-6 w-full text-left grid grid-cols-2 gap-4 text-sm">
                        <p><span className="font-semibold text-gray-400">Humidity:</span> {weather.humidity}%</p>
                        <p><span className="font-semibold text-gray-400">Wind:</span> {weather.windSpeed} km/h</p>
                    </div>
                    {sources.length > 0 && (
                        <div className="mt-4 w-full text-left text-xs text-gray-500">
                             <p className="font-semibold mb-1">Sources:</p>
                            {sources.map((source, i) => (
                                <a key={i} href={source.web.uri} target="_blank" rel="noopener noreferrer" className="block truncate hover:underline text-blue-400">
                                    {source.web.title || source.web.uri}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};

// --- Main App Component ---

export default function App() {
  const orientation = useOrientation();
  const [previewView, setPreviewView] = useState<string>('initial');
  
  const getView = (key: string) => {
      switch (key) {
        case 'portrait-primary': return <AlarmView />;
        case 'landscape-primary': return <StopwatchView />;
        case 'portrait-secondary': return <TimerView />;
        case 'landscape-secondary': return <WeatherView />;
        default: return <InitialView />;
      }
  }

    const previewOptions = [
      { key: 'initial', label: 'Home' },
      { key: 'portrait-primary', label: 'Alarm' },
      { key: 'landscape-primary', label: 'Stopwatch' },
      { key: 'portrait-secondary', label: 'Timer' },
      { key: 'landscape-secondary', label: 'Weather' },
    ];

//   useEffect(() => {
//     // NOTE: This is commented out to allow manual previewing.
//     // To restore orientation-based switching, uncomment this block
//     // and remove the preview controls below.
//     if (orientation !== 'unknown') {
//         setPreviewView(orientation);
//     }
//   }, [orientation]);

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden pt-20">
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10 h-full w-full bg-gray-900 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem]">
            <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_500px_at_50%_200px,#3b82f633,transparent)]"></div>
        </div>
        
        {/* Preview Controls */}
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-black/60 backdrop-blur-md p-2 rounded-2xl shadow-lg border border-white/10 flex items-center space-x-1 sm:space-x-2 flex-wrap justify-center">
            <span className="text-sm font-semibold text-gray-300 px-2 hidden sm:block">Preview:</span>
            {previewOptions.map(option => (
                 <button 
                    key={option.key} 
                    onClick={() => setPreviewView(option.key)}
                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${previewView === option.key ? 'bg-blue-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}
                >
                    {option.label}
                </button>
            ))}
        </div>

        {/* View Container with Transition */}
        <div key={previewView} className="animate-[fade-in_0.5s_ease-in-out]">
            {getView(previewView)}
        </div>
        
        {/* iOS Orientation Lock Info */}
        <div className="fixed bottom-4 left-4 right-4 text-center text-xs text-gray-500 bg-black/50 p-2 rounded-lg max-w-md mx-auto flex items-center justify-center space-x-2 backdrop-blur-sm">
            <Icon className="w-4 h-4 flex-shrink-0">{ICONS.INFO}</Icon>
            <span>On iOS/iPadOS, disable Portrait Orientation Lock for all features.</span>
        </div>
    </main>
  );
}