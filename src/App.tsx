import { useState, useEffect } from 'react';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import './App.css';

const WORK_TIME = 25*60
const BREAK_TIME = 5*60
const PREP_TIME = 30;

type Phase = 'WORK' | 'BREAK' | 'PREP';

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsRunning((prev) => !prev);
      }
      
      if (isRunning) return;

      if (/^[0-9]$/.test(e.key)) {
        const digit = parseInt(e.key, 10);
        setTime((prev) => prev*10 + digit);
      }

      if (e.key === 'Backspace') {
        setTime((prev) => Math.floor(prev / 10));
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning]);

  useEffect(() => {
    let interval: number | undefined;

    if (isRunning && time > 0) {
      interval = window.setInterval(() => setTime((t) => t - 1), 1000);
    }
    else if (isRunning && time == 0) {
      playAcidAlarm();

      let nextPhase: Phase;
      let nextTime: number;
      let notifTitle = '';
      let notifBody = '';

      if (phase === 'WORK') {
        nextPhase = 'BREAK';
        nextTime = BREAK_TIME;
        notifTitle = '集中フェーズ完了';
        notifBody = 'お疲れ様。アシッドな響きと共に5分の休憩に入りなさい。';
      } else if (phase == 'BREAK') {
        nextPhase = 'PREP';
        nextTime = PREP_TIME;
        notifTitle = '休憩終了';
        notifBody = '次の作業まであと30秒。姿勢を正し、準備を整えなさい。';
      } else {
        nextPhase = 'WORK';
        nextTime = WORK_TIME;
        notifTitle = '準備完了';
        notifBody = '現実に戻る時間ね。次の25分を始めましょう。';
      }
      
      sendNotification({ title: notifTitle, body: notifBody });
      setPhase(nextPhase);
      setTime(nextTime);
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

  const phaseText = {
    WORK: '集中フェーズ',
    BREAK: '休憩フェーズ',
    PREP: '準備フェーズ'
  };

  const phaseColor = {
    WORK: '#ff6b6b',
    BREAK: '#4ecdc4',
    PREP: '#feca57'
  };

  return (
    <div style={{ textAlign: 'center' }}>
      {/* 凹みパネルの中にフェーズ表示と時間を両方閉じ込める構成 */}
      <div className="timer-display" style={{ flexDirection: 'column' }}>
        <h2 className="phase-title" style={{ color: phaseColor[phase], marginBottom: '10px' }}>
          {phaseText[phase]}
        </h2>
        <div>
          {format(time)}
        </div>
      </div>
      <div className="button-group">
        {/* ボタン側の marginRight 指定も消してスッキリさせるわ */}
        <button onClick={() => setIsRunning(!isRunning)}>
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