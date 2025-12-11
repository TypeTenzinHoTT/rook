import inquirer from 'inquirer';
import chalk from 'chalk';
import { getCraftingRecipes, craft as craftApi } from '../lib/api.js';
import { maybeShowTip } from '../lib/ui.js';

export async function craft() {
  try {
    const recipes = await getCraftingRecipes();
    if (!recipes || recipes.length === 0) {
      console.log(chalk.yellow('No crafting recipes available yet. Earn more loot!'));
      return;
    }

    const choices = recipes.map((recipe) => {
      const ingredientsText = recipe.ingredients.map((ing) => `${ing.qty}x ${ing.name}`).join(', ');
      return {
        name: `${recipe.result.icon || '🎁'} ${recipe.name} — requires ${ingredientsText}`,
        value: recipe.code
      };
    });

    const { selectedRecipe } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedRecipe',
        message: 'What would you like to craft?',
        choices: [...choices, new inquirer.Separator(), { name: 'Cancel', value: null }]
      }
    ]);

    if (!selectedRecipe) return;

    const result = await craftApi(selectedRecipe);
    if (result.success) {
      console.log(chalk.green(`\n✨ Crafted: ${result.crafted} ${result.icon || ''}`));
    } else {
      console.log(chalk.red(`\n✖ ${result.error}`));
    }
  } catch (error) {
    console.log(chalk.red('✖ Could not craft item'));
  } finally {
    maybeShowTip();
  }
}
