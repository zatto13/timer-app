import { useState, useEffect } from 'react';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import './App.css';

const WORK_TIME = 10//25*60
const BREAK_TIME = 10//5*60

type Phase = 'WORK' | 'BREAK';

const playAcidAlarm = () => {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const now = audioCtx.currentTime;

  const sequence = [220, 440, 220, 880, 220, 400];
  const noteLength = 0.12;

  sequence.forEach((freq, index) => {
    const startTime = now + index * noteLength;

    const osc = audioCtx.createOscillator();
    const fliter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, startTime);

    fliter.type = 'lowpass';
    fliter.Q.value = 20;

    fliter.frequency.setValueAtTime(5000, startTime);
    fliter.frequency.exponentialRampToValueAtTime(100, startTime + noteLength - 0.02);

    gain.gain.setValueAtTime(0.5, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteLength - 0.02);

    osc.connect(fliter);
    fliter.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + noteLength);
  });
};

function App() {
  const [time, setTime] = useState(WORK_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>('WORK');

  useEffect(() => {
    const initNotification = async () => {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }
    };
    initNotification();
  }, []);

  useEffect(() => {
    let interval: number | undefined;

    if (isRunning && time > 0) {
      interval = window.setInterval(() => setTime((t) => t - 1), 1000);
    }
    else if (isRunning && time == 0) {
      playAcidAlarm();

      const nextPhase = phase === 'WORK' ? 'BREAK' : 'WORK';
      
      sendNotification({
        title: nextPhase === 'BREAK' ? '集中フェーズ完了' : '休憩終了',
        body: nextPhase === 'BREAK'
          ? 'お疲れ様。アシッドな響きと共に5分の休憩に入りなさい。'
          : '現実に戻る時間ね。次の25分を始めましょう。'
      })

      setPhase(nextPhase);
      setTime(nextPhase === 'WORK' ? WORK_TIME : BREAK_TIME);
    }

    return () => clearInterval(interval);
  }, [isRunning, time, phase]);

  const format = (t: number) =>
    `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;

  const handleReset = () => {
    setIsRunning(false);
    setPhase('WORK');
    setTime(WORK_TIME)
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '40px' }}>
      <h2 style={{ color: phase === 'WORK' ? '#ff6b6b' : '#4ecdc4'}}>
        {phase === 'WORK' ? '集中フェーズ' : '休憩フェーズ'}
      </h2>
      <h1 style={{ fontSize: '4rem', fontFamily: 'monospace' }}>
        {format(time)}
      </h1>
      <div style={{ marginTop: '20px' }}>
        <button onClick={() => setIsRunning(!isRunning)} style={{ marginRight: '10px' }}>
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button onClick={handleReset}>
          Reset
        </button>
      </div>
    </div>
  );
}

export default App;