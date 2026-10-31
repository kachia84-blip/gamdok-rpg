import { h } from '../dom.js';
import { scene } from './scene.js';
import { RELICS } from '../../core/run.js';

export function runScene(props) {
  const { run } = props;
  return h('div', {}, h('p', { className: 'run-status' }, `${run.day}/5일차${run.day === 5 ? ' · 기획감독' : ''}`),
    run.relics.length > 0 && h('p', { className: 'relic-list' }, run.relics.map(id => `${RELICS[id].emoji} ${RELICS[id].name}`).join(' · ')),
    scene(props));
}
