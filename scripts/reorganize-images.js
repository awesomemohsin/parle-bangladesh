const fs = require('fs');
const path = require('path');

const IMG_DIR = path.join(__dirname, '..', 'public', 'images');
const NEW_DIRS = [
  'biscuits', 
  'chocolate-biscuits', 
  'cream-biscuits', 
  'fab-biscuits', 
  'crackers', 
  'healthy-snacks', 
  'wafers-chips'
];

// Create new directories
NEW_DIRS.forEach(dir => {
  const fullPath = path.join(IMG_DIR, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created: ${dir}`);
  }
});

// Helper to move folder or file safely
function move(oldPath, newPath) {
  const oldFullPath = path.join(IMG_DIR, oldPath);
  const newFullPath = path.join(IMG_DIR, newPath);
  if (fs.existsSync(oldFullPath)) {
    if (!fs.existsSync(path.dirname(newFullPath))) {
      fs.mkdirSync(path.dirname(newFullPath), { recursive: true });
    }
    // If it's a directory move its contents or move it directly if possible
    if (fs.lstatSync(oldFullPath).isDirectory()){
        // Just move the whole folder into the target folder if we want to nest, 
        // but here we might want to flatten.
        // Actually move folder or content.
        fs.cpSync(oldFullPath, newFullPath, { recursive: true });
        console.log(`Copied ${oldPath} to ${newPath}`);
    } else {
        fs.copyFileSync(oldFullPath, newFullPath);
        console.log(`Copied file ${oldPath} to ${newPath}`);
    }
  }
}

// 1. Move Biscuits
move('parle-g-classic-biscuits/parle-g-gold', 'biscuits/parle-g-gold');
move('parle-g-classic-biscuits/krack-jack-multipack', 'biscuits/krack-jack');
move('healthy-digestive-oats/parle-g-oats-berries', 'biscuits/parle-g-oats-berries');

// 2. Chocolate Biscuits
move('choco-rolls-chocolate-cookies/hide-seek-choco-rolls', 'chocolate-biscuits/hide-seek-choco-rolls');
move('choco-rolls-chocolate-cookies/hide-seek-chox-cookies', 'chocolate-biscuits/hide-seek-chox-cks');
move('biscuits/hide-seek-caffemocha', 'chocolate-biscuits/hide-seek-caffemocha');
move('biscuits/hide-seek-choco-chips', 'chocolate-biscuits/hide-seek-choco-chips');
move('biscuits/hide-seek-triple-delight-tin', 'chocolate-biscuits/hide-seek-triple-delight');
move('biscuits/hide-seek-bulk-pack', 'chocolate-biscuits/hide-seek-bulk');

// 3. Cream Biscuits
move('bourbon-cream-biscuits/hide-seek-bourbon', 'cream-biscuits/hide-seek-bourbon');
move('bourbon-cream-biscuits/hide-seek-black-bourbon', 'cream-biscuits/hide-seek-bourbon/black-chocolate');
move('bourbon-cream-biscuits/kreams-bourbon', 'cream-biscuits/kreams-bourbon');
move('bourbon-cream-biscuits/jam-in-cream', 'cream-biscuits/jam-in-cream');
move('centre-filled-cookies/hide-seek-centre-filled', 'cream-biscuits/hide-seek-centre-filled');

// 4. FAB - already in right place, but ensure separation if needed.
// Actually just keeping existing for now.

// 5. Crackers
move('healthy-digestive-oats/nutricrunch-lite-cracker', 'crackers/nutricrunch-lite-cracker');

// 6. Healthy Snacks
move('healthy-digestive-oats/nutricrunch-banana-cinnamon-oats', 'healthy-snacks/nutricrunch-cookies/banana-cinnamon-oat');
move('healthy-digestive-oats/nutricrunch-cranberry-cashew-oats', 'healthy-snacks/nutricrunch-cookies/cranberry-cashew-oats');

// 7. Wafers
move('wafers/parle-wafer-bulk', 'wafers-chips/parle-wafer');

console.log('Image restructuring finished. Cleanup recommended.');
