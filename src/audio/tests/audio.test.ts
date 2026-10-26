import {
  AudioBackend, configureAudio, playMusic, playSfx, resetAudioForTests, setAudioBackend, stopMusic,
} from '../audio';
import { it, expect, describe, beforeEach } from '@jest/globals';

function fake() {
  const log: string[] = [];
  const b: AudioBackend = {
    playSfx: (n) => log.push(`sfx:${n}`),
    playMusic: (t) => log.push(`music:${t}`),
    stopMusic: () => log.push('stop'),
  };
  return { b, log };
}

describe('audio routing', () => {

    it('starts music requested before the backend existed once the backend arrives', () => {
    playMusic('menu');
    const { b, log } = fake();
    setAudioBackend(b);
    expect(log).toEqual(['music:menu']);
  });
  it('does not start it on arrival when music is off', () => {
    configureAudio({ sound: true, music: false });
    playMusic('menu');
    const { b, log } = fake();
    setAudioBackend(b);
    expect(log).toEqual([]);
  });
  
  beforeEach(resetAudioForTests);

  it('is silent and safe with the default backend', () => {
    expect(() => { playSfx('hit_light'); playMusic('menu'); stopMusic(); }).not.toThrow();
  });
  it('plays sound effects only when sound is on', () => {
    const { b, log } = fake(); setAudioBackend(b);
    playSfx('dodge');
    configureAudio({ sound: false, music: true });
    playSfx('hurt');
    expect(log).toEqual(['sfx:dodge']);
  });
  it('stops music when switched off and resumes the current track when switched back on', () => {
    const { b, log } = fake(); setAudioBackend(b);
    playMusic('world_2');
    configureAudio({ sound: true, music: false });
    configureAudio({ sound: true, music: true });
    expect(log).toEqual(['music:world_2', 'stop', 'music:world_2']);
  });
  it('does not start music while music is off', () => {
    const { b, log } = fake(); setAudioBackend(b);
    configureAudio({ sound: true, music: false });
    log.length = 0;
    playMusic('boss');
    expect(log).toEqual([]);
  });
});