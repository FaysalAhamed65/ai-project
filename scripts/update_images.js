const fs = require('fs');
const path = require('path');
const imagesDir = path.join(process.cwd(), 'public', 'images_face');
const outJson = path.join(process.cwd(), 'data', 'images.json');

const images = [];

for (let i = 1; i <= 50; i++) {
  const celebNum = i.toString().padStart(2, '0');
  const celebId = `celeb${celebNum}`;
  const celebDir = path.join(imagesDir, celebId);
  
  if (fs.existsSync(celebDir)) {
    const files = fs.readdirSync(celebDir).filter(f => !f.startsWith('.')).sort();
    
    // Rename if they don't match \d\d\.ext
    let count = 1;
    for (const file of files) {
      const ext = path.extname(file);
      const newName = `${count.toString().padStart(2, '0')}${ext}`;
      if (file !== newName) {
        fs.renameSync(path.join(celebDir, file), path.join(celebDir, newName));
      }
      
      const photoId = `${celebId}_${count.toString().padStart(2, '0')}`;
      images.push({
        id: photoId,
        celebId: celebId,
        src: `/images_face/${celebId}/${newName}`,
        label: `People ${celebNum} - ${count.toString().padStart(2, '0')}`
      });
      count++;
    }
  }
}

fs.writeFileSync(outJson, JSON.stringify(images, null, 2));
console.log('Renamed files and generated data/images.json');
