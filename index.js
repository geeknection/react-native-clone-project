#!/usr/bin/env node

const program = require('commander');
const { join } = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');
const inquirer = require('inquirer');
const chalk = require('chalk');
const Table = require('cli-table');
const shell = require('shelljs');
const figlet = require('figlet');
const loading = require('loading-cli');
const os = require('os');

const package = require('./package.json');

program.version(package.version);

console.log(chalk.cyan(figlet.textSync('BuuhV Inc - Clone Project')));
const sleep = () => new Promise((resolve) => setTimeout(() => resolve(), 500));

/***
 * Renomeia os arquivos do novo projeto
 */
async function renameProject(project) {
    const load = loading("Renomeado pacotes").start();
    await sleep();

    const pack = require(project.dest + '\\app.json');

    function replaceContent(file) {
        shell.sed('-i', project.packageOld, project.packageNew, file);
        shell.sed('-i', pack.name, project.name.toLowerCase(), file);
        shell.sed('-i', pack.displayName, project.name.toLowerCase(), file);
        shell.sed('-i', pack.name, project.name, file);
        shell.sed('-i', pack.displayName, project.name, file);
        console.log(file, chalk.green('RENOMEADO'));
    };

    const paths = [
        `${project.dest}/*.js`,
        `${project.dest}/*.json`,
        `${project.dest}/**/*.xml`,
        `${project.dest}/**/*.java`,
        `${project.dest}/**/*.gradle`,
        `${project.dest}/**/*.h`,
        `${project.dest}/**/*.m`,
        `${project.dest}/**/*.xcscheme`,
        `${project.dest}/**/*.storyboard`,
        `${project.dest}/**/*.plist`,
        `${project.dest}/**/*.pro`,
        `${project.dest}/ios/Podfile`
    ];

    paths.forEach(item => {
        shell.ls(item).forEach((file) => replaceContent(file));
    });
    load.stop();

    const load2 = loading('Creating folders in the new package').start();
    await sleep();

    const pathAndroid = `${project.dest}\\android\\app\\src\\main\\java\\${project.packageNew.replace(/\./g, '\\')}`;
    const pathIOS = `${project.dest}\\ios`;

    const foldersIOS = ['', '-tvOS', '-tvOSTests', '.xcodeproj', 'Tests'];

    await Promise.all(
        foldersIOS.map(async folder => {
            await new Promise((resolve) => {
                fs.rename(`${pathIOS}\\${pack.name}${folder}`, `${pathIOS}\\${project.name.toLowerCase()}${folder}`, function (err) {
                    if (err) {
                        console.log(chalk.yellow('Failed to rename IOS folder.'), chalk.red('File or folder does not exist'));
                        resolve();
                    } else {
                        console.log(chalk.green("IOS directory renamed successfully!"));
                        resolve();
                    }
                });
            });
        })
    );

    load2.stop();

    const load3 = loading("Renaming files in the IOS folder").start();
    const iosFilesRename = [
        {
            from: `${pathIOS}\\${project.name.toLowerCase()}.xcodeproj\\xcshareddata\\xcschemes\\${pack.name.toLowerCase()}-tvOS.xcscheme`,
            to: `${pathIOS}\\${project.name.toLowerCase()}.xcodeproj\\xcshareddata\\xcschemes\\${project.name.toLowerCase()}-tvOS.xcscheme`
        },
        {
            from: `${pathIOS}\\${project.name.toLowerCase()}.xcodeproj\\xcshareddata\\xcschemes\\${pack.name.toLowerCase()}.xcscheme`,
            to: `${pathIOS}\\${project.name.toLowerCase()}.xcodeproj\\xcshareddata\\xcschemes\\${project.name.toLowerCase()}.xcscheme`
        },
        {
            from: `${pathIOS}\\${project.name.toLowerCase()}Tests\\${pack.name.toLowerCase()}Tests.m`,
            to: `${pathIOS}\\${project.name.toLowerCase()}Tests\\${project.name.toLowerCase()}Tests.m`
        }
    ];

    await Promise.all(
        iosFilesRename.map(async folder => {
            await new Promise((resolve) => {
                fs.rename(folder.from, folder.to, function (err) {
                    if (err) {
                        console.log(chalk.yellow('Failed to rename IOS file.'), chalk.red('File or folder does not exist'));
                        resolve();
                    } else {
                        console.log(chalk.green("IOS file successfully renamed!"));
                        resolve();
                    }
                });
            });
        })
    );

    load3.stop();

    const load4 = loading("Copying contents of the previous package to the new package").start();
    const source = `${project.dest}\\android\\app\\src\\main\\java\\${project.packageOld.replace(/\./g, '\\')}`;

    await new Promise((resolve) => {
        fsExtra.move(source, pathAndroid, function (err) {
            if (err) {
                console.log(chalk.red('Failed to copy files to the new directory'), err.message);
            }
            else {
                console.log(chalk.green('Files copied to the new directory'));
            }
            resolve();
        });
    });

    load4.stop();
}

program
    .command('clone [white-label]')
    .description('Clone project to new package')
    .action(async (whiteLabel, options) => {
        let answers;
        if (!whiteLabel) {
            answers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'name',
                    message: 'What is the name of your white label?',
                    validate: value => value ? true : 'An empty white-label is not allowed'
                },
                {
                    type: 'input',
                    name: 'source',
                    message: 'What is the current project folder?',
                    validate: value => value ? true : 'An empty directory is not allowed'
                },
                {
                    type: 'input',
                    name: 'dest',
                    message: 'What is the target folder of the project',
                    validate: value => value ? true : 'An empty directory is not allowed'
                },
                {
                    type: 'input',
                    name: 'packageOld',
                    message: 'What is the name of the old package?',
                    validate: value => value ? true : 'An empty package is not allowed'
                },
                {
                    type: 'input',
                    name: 'packageNew',
                    message: 'What is the name of the new package?',
                    validate: value => value ? true : 'An empty package is not allowed'
                }
            ]);
        }

        const load = loading("Cloning project").start();

        /** CÓPIA O PROJETO */
        setTimeout(() => {
            shell.exec('mkdir ' + answers.dest);
            shell.rm('-rf', answers.dest);
            setTimeout( async () => {
                if (os.platform === 'linux') {
                    shell.exec(`rsync -av --progress ${answers.source} / ${answers.dest} --exclude node_modules --exclude .history --exclude .git`);
                }
                else {
                    shell.exec(`robocopy ${answers.source} ${answers.dest} /mir /xd node_modules .history .git`);
                }
                load.stop();
                
                await renameProject(answers);

                console.log(chalk.blue('PROJECT CLONE CREATED, PLEASE CLEAN THE CACHE AND RECOMPILE YOUR PROJECT!'));
            }, 1000);
        }, 1000);
        /** FIM DA CÓPIA */

    });

program.parse(process.argv);