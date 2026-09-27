/*
  큰길브리지 전자명함 — 좋아요 · 댓글 (명함 페이지 아래쪽)

  명함 HTML(template.js)에는 빈 자리(<section id="kb-social" data-slug="이름">)만 있고, 이 파일이 서버에서 받아 채운다.
  그래서 이미 발행된 명함을 다시 만들지 않아도 이 파일만 고치면 모든 명함에 반영된다.

  서버 = 명함 서버(apps-script/card/Code.gs)
    GET  ?social=1&slug=이름&device=기기   → { ok, likes, liked, comments:[{ id, name, text, at, mine }] }
    POST { action:'like', slug, device, on }                    → { ok, likes, liked }
    POST { action:'comment', slug, device, name, text }         → { ok, comment }
    POST { action:'comment-delete', slug, device, id, owner?, pw? } → { ok }

  지킬 것: 남이 쓴 글은 textContent 로만 넣는다(innerHTML 금지). 기기 번호는 이 브라우저가 만든 난수라 비밀이 아니다.
  명함 주인 열쇠(kb-card-owner)는 내 댓글이 아닌 것을 지울 때만 보낸다.
*/
(function () {
  var 서버 = 'https://script.google.com/macros/s/AKfycbxSIKrM5evBd7EBh21h6H42Jr6_H0bH9bhM6F5qx7tGS4J8RvI91rs9jflneEmQNFRt/exec';
  var box = document.getElementById('kb-social');
  if (!box) return;
  var slug = box.getAttribute('data-slug') || '';
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) return;        // 미리보기(이름 없음)면 안내문만 남긴다
  /* 서버가 명함을 다시 그리며 구워 넣은 좋아요 · 댓글이 있으면(data-baked) 서버 응답이 올 때까지 그대로 두고,
     서버가 안 되면 그것을 그대로 남긴다 — 검색엔진과 사람 모두 그 글을 본다 */
  var 구움 = box.getAttribute('data-baked') === '1';

  var 상태 = { likes: 0, liked: false, comments: [], 주인: false, 보내는중: false };
  var 관리자비번 = '';
  try { 관리자비번 = sessionStorage.getItem('kb-social-admin') || ''; } catch (e) {}

  /* ── 저장된 것들 ─────────────────────────────── */
  function 저장(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function 읽기(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function 기기() {
    var d = 읽기('kb-social-device');
    if (/^[0-9a-f]{32}$/.test(d)) return d;
    var 글 = '';
    try {
      var a = new Uint8Array(16); crypto.getRandomValues(a);
      for (var i = 0; i < a.length; i++) 글 += ('0' + a[i].toString(16)).slice(-2);
    } catch (e) { while (글.length < 32) 글 += Math.floor(Math.random() * 16).toString(16); }
    저장('kb-social-device', 글);
    return 글;
  }

  /* 명함 주인인가 — 이 브라우저의 열쇠 지문이 명함에 박힌 지문과 같으면 주인. 주인은 어떤 댓글이든 지울 수 있다 */
  function 주인확인() {
    var meta = document.querySelector('meta[name="card-owner"]');
    var 열쇠 = 읽기('kb-card-owner');
    if (!meta || !열쇠 || !(window.crypto && crypto.subtle)) return Promise.resolve(false);
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(열쇠)).then(function (buf) {
      var h = ''; var b = new Uint8Array(buf);
      for (var i = 0; i < b.length; i++) h += ('0' + b[i].toString(16)).slice(-2);
      return h === meta.getAttribute('content');
    }).catch(function () { return false; });
  }

  /* ── 서버 ────────────────────────────────────── */
  function GET() {
    var url = 서버 + '?social=1&slug=' + encodeURIComponent(slug) + '&device=' + 기기() + '&t=' + Date.now();
    return fetch(url, { cache: 'no-store' }).then(function (r) { return r.json(); });
  }
  function POST(자료) {
    자료.slug = slug; 자료.device = 기기();
    return fetch(서버, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(자료) })
      .then(function (r) { return r.json(); });
  }

  /* ── 그리기 ──────────────────────────────────── */
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var 하트 = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.5-9.1C1 8.3 3.3 4.9 6.8 4.9c1.9 0 3.5 1 4.4 2.5.9-1.5 2.5-2.5 4.4-2.5 3.5 0 5.8 3.4 4.3 7-2 4.5-9.5 9.1-9.5 9.1z"/></svg>';

  function 시간전(at) {
    var d = Math.max(0, Date.now() - Number(at || 0));
    var m = Math.floor(d / 60000);
    if (m < 1) return '방금';
    if (m < 60) return m + '분 전';
    var h = Math.floor(m / 60);
    if (h < 24) return h + '시간 전';
    var day = Math.floor(h / 24);
    if (day < 30) return day + '일 전';
    var t = new Date(Number(at));
    return t.getFullYear() + '.' + (t.getMonth() + 1) + '.' + t.getDate();
  }

  var 좋아요단추, 개수칸, 목록, 이름칸, 글칸, 보내기단추, 말칸;

  function 틀그리기() {
    box.textContent = '';

    var likes = el('div', 'likes');
    좋아요단추 = el('button', 'like');
    좋아요단추.type = 'button';
    좋아요단추.innerHTML = 하트 + '<span>좋아요</span> <span class="n">0</span>';
    개수칸 = 좋아요단추.querySelector('.n');
    좋아요단추.addEventListener('click', 좋아요누름);
    likes.appendChild(좋아요단추);
    likes.appendChild(el('span', 'who', '이 명함이 도움이 됐다면 눌러 주세요'));
    box.appendChild(likes);

    목록 = el('div', 'cmts');
    box.appendChild(목록);

    var form = el('form', 'cform');
    글칸 = el('textarea'); 글칸.placeholder = '댓글을 남겨 주세요 (300자까지)'; 글칸.maxLength = 300; 글칸.rows = 3;
    var row = el('div', 'row');
    이름칸 = el('input'); 이름칸.type = 'text'; 이름칸.placeholder = '이름 또는 닉네임'; 이름칸.maxLength = 20; 이름칸.value = 읽기('kb-social-name');
    이름칸.autocomplete = 'nickname';
    보내기단추 = el('button', null, '댓글 남기기'); 보내기단추.type = 'submit';
    row.appendChild(이름칸); row.appendChild(보내기단추);
    form.appendChild(글칸); form.appendChild(row);
    form.appendChild(el('small', null, '이름과 내용은 이 명함 페이지에 공개됩니다. 링크는 넣을 수 없고, 쓴 사람과 명함 주인이 지울 수 있습니다.'));
    form.addEventListener('submit', 댓글보냄);
    box.appendChild(form);

    말칸 = el('p', 'msg', '');
    box.appendChild(말칸);
  }

  function 말(글, 나쁨) { if (!말칸) return; 말칸.textContent = 글 || ''; 말칸.className = 'msg' + (나쁨 ? ' bad' : ''); }

  function 좋아요그리기() {
    if (!좋아요단추) return;
    개수칸.textContent = String(상태.likes);
    좋아요단추.className = 'like' + (상태.liked ? ' on' : '');
    좋아요단추.setAttribute('aria-pressed', 상태.liked ? 'true' : 'false');
  }

  function 댓글그리기() {
    if (!목록) return;
    목록.textContent = '';
    if (!상태.comments.length) { 목록.appendChild(el('p', 'none', '아직 댓글이 없습니다. 첫 댓글을 남겨 보세요.')); return; }
    상태.comments.forEach(function (c) {
      var item = el('div', 'cmt');
      item.setAttribute('data-id', c.id);
      var hd = el('div', 'hd');
      hd.appendChild(el('b', null, c.name || '익명'));
      hd.appendChild(el('span', null, 시간전(c.at)));
      if (c.mine || 상태.주인 || 관리자비번) {
        var del = el('button', null, '지우기'); del.type = 'button';
        del.addEventListener('click', function () { 댓글지움(c, item); });
        hd.appendChild(del);
      }
      item.appendChild(hd);
      item.appendChild(el('p', null, c.text || ''));
      목록.appendChild(item);
    });
  }

  /* ── 동작 ────────────────────────────────────── */
  function 좋아요누름() {
    if (상태.보내는중) return;
    var 이전 = { likes: 상태.likes, liked: 상태.liked };
    상태.liked = !상태.liked; 상태.likes += 상태.liked ? 1 : -1; if (상태.likes < 0) 상태.likes = 0;
    좋아요그리기(); 말('');
    상태.보내는중 = true;
    POST({ action: 'like', on: 상태.liked }).then(function (r) {
      if (!r || !r.ok) throw new Error((r && r.error) || '');
      상태.likes = Number(r.likes) || 0; 상태.liked = !!r.liked; 좋아요그리기();
    }).catch(function (e) {
      상태.likes = 이전.likes; 상태.liked = 이전.liked; 좋아요그리기();
      말(e && e.message ? e.message : '좋아요를 보내지 못했습니다. 잠시 뒤 다시 눌러 주세요', true);
    }).then(function () { 상태.보내는중 = false; });
  }

  function 댓글보냄(ev) {
    ev.preventDefault();
    var name = 이름칸.value.replace(/\s+/g, ' ').trim().slice(0, 20);
    var text = 글칸.value.replace(/\r/g, '').trim().slice(0, 300);
    if (!name) { 이름칸.focus(); return 말('이름(닉네임)을 적어 주세요', true); }
    if (text.length < 2) { 글칸.focus(); return 말('댓글 내용을 적어 주세요', true); }
    if (/https?:\/\/|www\./i.test(name + ' ' + text)) { 글칸.focus(); return 말('댓글에는 링크를 넣을 수 없습니다', true); }
    저장('kb-social-name', name);
    보내기단추.disabled = true; 말('보내는 중…');
    POST({ action: 'comment', name: name, text: text }).then(function (r) {
      if (!r || !r.ok || !r.comment) throw new Error((r && r.error) || '');
      상태.comments.unshift(r.comment);
      댓글그리기(); 글칸.value = ''; 말('댓글을 남겼습니다');
    }).catch(function (e) {
      말(e && e.message ? e.message : '댓글을 보내지 못했습니다. 잠시 뒤 다시 해 주세요', true);
    }).then(function () { 보내기단추.disabled = false; });
  }

  function 댓글지움(c, item) {
    if (!confirm('이 댓글을 지울까요?')) return;
    var 자료 = { action: 'comment-delete', id: c.id };
    if (!c.mine && 상태.주인) 자료.owner = 읽기('kb-card-owner');
    if (!c.mine && !상태.주인 && 관리자비번) 자료.pw = 관리자비번;
    item.style.opacity = '.4';
    POST(자료).then(function (r) {
      if (!r || !r.ok) throw new Error((r && r.error) || '');
      상태.comments = 상태.comments.filter(function (x) { return x.id !== c.id; });
      댓글그리기(); 말('지웠습니다');
    }).catch(function (e) {
      item.style.opacity = '';
      말(e && e.message ? e.message : '지우지 못했습니다', true);
    });
  }

  /* ── 시작 ────────────────────────────────────── */
  function 준비중(글) {
    if (구움 && !좋아요단추) {
      var ph = box.querySelector('.ph');
      if (ph) ph.textContent = 글 || '댓글 쓰기는 잠시 준비 중입니다';
      return;
    }
    box.textContent = '';
    box.appendChild(el('p', 'ph', 글 || '좋아요 · 댓글은 잠시 준비 중입니다'));
  }

  function 불러오기() {
    return GET().then(function (r) {
      if (!r || !r.ok || typeof r.likes !== 'number' || !Array.isArray(r.comments)) throw new Error('not ready');
      상태.likes = r.likes; 상태.liked = !!r.liked; 상태.comments = r.comments;
      if (!좋아요단추) 틀그리기();
      좋아요그리기(); 댓글그리기(); 말('');
      return true;
    }).catch(function () { 준비중(); return false; });
  }

  /* 관리자: 주소 뒤에 ?admin=1 을 붙여 열면 비밀번호를 한 번 묻고, 이 탭에서는 모든 댓글에 「지우기」가 보인다 */
  if (/[?&]admin=1/.test(location.search) && !관리자비번) {
    var 입력 = prompt('관리자 비밀번호');
    if (입력) { 관리자비번 = 입력; try { sessionStorage.setItem('kb-social-admin', 입력); } catch (e) {} }
  }

  주인확인().then(function (주인) { 상태.주인 = 주인; return 불러오기(); });

  window.kbSocial = { reload: 불러오기, state: 상태 };
})();
