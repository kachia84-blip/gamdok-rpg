# 전투 효과 시트 (pixelfx)

pixelfx(github.com/patch-gg/pixelfx, 작업용 복사본 `클로드/pixelfx`)로 뽑은 스프라이트 시트입니다.
15fps로 뽑아 한 줄 띠로 다시 붙이고 96색 팔레트 PNG로 줄였습니다. 재생은 ui/fx.js의 sprite()와 game.css의 .pfx.

| 파일 | 원본 효과 | 쓰는 곳 |
|---|---|---|
| hit.png | impacts/blunt-hit | 일반 타격 |
| hurt.png | impacts/blunt-hit (붉은 팔레트) | 주인공 피격 |
| crit.png | impacts/crit-hit | 치명타 |
| poof.png | spawn/poof | 치명타 처치 |

다시 뽑기: `node tools/render.mjs impacts/blunt-hit --sheet --fps 15 --out <폴더>` 뒤 띠로 붙이고 팔레트로 줄인다.
피격 팔레트: ["#14040a","#3a0a14","#6a101c","#a01824","#d42a30","#ff5a50","#ffffff"], warm #ff7a6a, dust #a07070, clod #5a2a2a.
