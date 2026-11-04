import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
import { test } from 'node:test'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

// Exercise the actual TypeScript classifier without adding a test dependency.
const source = fs.readFileSync(require.resolve('../src/lib/groceryCategories.ts'), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } })
const loaded = { exports: {} }
new Function('exports', 'require', 'module', compiled.outputText)(loaded.exports, require, loaded)
const { detectGroceryCategory, BRING_POPULAR_ITEMS } = loaded.exports

const cases = {
  'Pain à l’ail': 'bakery',
  'Pain au chocolat': 'bakery',
  'Pain au lait': 'bakery',
  'Chocolat au lait': 'pantry',
  'Lait au chocolat': 'dairy',
  'Jus d’orange': 'drinks',
  'Jus de pommes': 'drinks',
  'Sauce tomate': 'pantry',
  'Curry en poudre': 'pantry',
  'Curry': 'pantry',
  'Concentré de tomate': 'pantry',
  'Lait d’amande': 'drinks',
  'Lait de coco': 'pantry',
  'Beurre de cacahuètes': 'pantry',
  'Haricots verts': 'produce',
  'Haricots rouges': 'pantry',
  'Pommes de terre': 'produce',
  'Tomates cerises': 'produce',
  '2 courgettes': 'produce',
  'Œufs': 'dairy',
  'Oeufs': 'dairy',
  'CRÈME FRAÎCHE': 'dairy',
  'Crème solaire': 'home',
  'Savon au lait': 'home',
  'Liquide Vaiselle': 'home',
  'Liquide vaisselle': 'home',
  'Liquide vaiselle au citron': 'home',
  'Sel régénérant': 'home',
  'Pastilles lave-vaisselle au citron': 'home',
  'Petits pois surgelés': 'frozen',
  'Épinards surgelés': 'frozen',
  'Poisson pané': 'frozen',
  'Crème glacée': 'frozen',
  'Poireaux': 'produce',
  'Eau minérale': 'drinks',
  'Couteau': 'other',
  'Portefeuille': 'other',
  'ailes de poulet': 'meat',
  'ra': 'other',
  '': 'other',
}
for (const [name, expected] of Object.entries(cases)) {
  test(`${JSON.stringify(name)} → ${expected}`, () => {
    assert.equal(detectGroceryCategory(name).id, expected)
  })
}
for (const item of BRING_POPULAR_ITEMS) {
  test(`suggestion ${item.name}`, () => {
    assert.equal(detectGroceryCategory(item.name).id, item.category)
  })
}
