import { h, button, heading, panel } from './common.js';
import { msgbox } from './msgbox.js';
export function story({ title, lines, teaser, reward, teaserTitle = '2장 예고', doneLabel = '지청으로', onDone }) {
  const done = button(doneLabel, onDone, { className: 'primary full', disabled: true });
  const queue = [...lines, ...(reward ? [reward] : []), ...(teaser ?? []).map(text => ({ text, speaker: teaserTitle }))];
  const content = panel();
  const dialogue = msgbox({ lines: queue, speaker: title, onDone: () => {
    dialogue.dispose();
    content.replaceChildren(...(teaser ? [h('h2', {}, teaserTitle)] : []), h('p', {}, teaser?.at(-1) ?? reward ?? lines.at(-1)));
    done.disabled = false;
  } });
  content.append(dialogue);
  const screen = h('div', { className: `story-screen${teaser ? ' chapter-victory' : ''}` }, heading('감독관 RPG', title), content, done);
  screen.dispose = () => dialogue.dispose();
  return screen;
}
