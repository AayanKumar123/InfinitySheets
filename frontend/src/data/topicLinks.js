// Links a student can open from a topic page: general explainers searched for
// the exact topic, plus the official / archive sources for their board from the
// material-source directory. We link out; nothing is re-hosted.
import { RESOURCE_TRACKS } from './resources';

const enc = encodeURIComponent;

export function topicLinks({ board, subject, topic }) {
  const q = `${subject} ${topic}`;
  const general = [
    { title: 'Khan Academy', desc: 'Free lessons, videos and practice on this topic.', url: `https://www.khanacademy.org/search?page_search_query=${enc(q)}` },
    { title: 'YouTube', desc: 'Video explanations — filter for your board.', url: `https://www.youtube.com/results?search_query=${enc(`${board} ${q}`)}` },
    { title: 'Save My Exams', desc: 'Board-specific revision notes and topic questions.', url: `https://www.savemyexams.com/search/?q=${enc(`${board} ${q}`)}` },
    { title: 'Physics & Maths Tutor', desc: 'Topic questions, notes and past-paper packs.', url: `https://www.physicsandmathstutor.com/?s=${enc(q)}` },
    { title: 'Wikipedia', desc: 'Background reading for the concept itself.', url: `https://en.wikipedia.org/w/index.php?search=${enc(topic)}` },
  ];
  const track = RESOURCE_TRACKS.find((t) => t.id === board);
  const official = track
    ? track.groups.flatMap((g) => g.links.map((l) => ({ ...l, group: g.label }))).slice(0, 6)
    : [];
  return { general, official, note: track?.note || null, boardName: track?.name || board };
}
