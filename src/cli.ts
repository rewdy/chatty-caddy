#!/usr/bin/env bun
import chalk from "chalk";
import { addCommand } from "./commands/add";
import { listCommand } from "./commands/list.tsx";

const [, , command, ...args] = process.argv;

const HELP = `
${chalk.bgCyan.black.bold(" chatty-caddy ")} ${chalk.cyan("— your AI prompt notebook")}

${chalk.bold("Usage:")}
  ${chalk.cyan("chatty-caddy")} <command>
  ${chalk.cyan("chaca")} <command>

${chalk.bold("Commands:")}
  ${chalk.cyan("add")}    Add a new prompt
  ${chalk.cyan("list")}   Browse, search, and run saved prompts
  ${chalk.cyan("help")}   Show this help message
`;

switch (command) {
  case "add":
    await addCommand();
    break;
  case "list":
  case "ls":
    await listCommand();
    break;
  case "help":
  case "--help":
  case "-h":
  case undefined:
    console.log(HELP);
    break;
  default:
    console.log(chalk.red(`Unknown command: ${chalk.bold(command)}`));
    console.log(HELP);
    process.exit(1);
}
