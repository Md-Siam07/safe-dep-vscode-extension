// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { json } from "stream/consumers";
import axios from "axios";

const SERVER_URL = "http://127.0.0.1:5001";
let timeout: NodeJS.Timeout | null = null;

const featureNames = [
  "Personal Identifiable Information Access",
  "System File Access",
  "Runtime Process Creation",
  "Network Acess",
  "Cryptographic Functionalities",
  "Data Encoding Enabled",
  "Dynamic Code Generation",
  "Installs Other Packages",
  "Accesses Geolocation",
  "The Code is Minified",
  "Package has No Content",
  "Longest Line in Package",
  "Number of Lines in Package",
  "The Package has Lisence",
];

const decorationsMap: { [key: string]: vscode.DecorationOptions } = {};

const alternatingLineDecorationType =
  vscode.window.createTextEditorDecorationType({
    backgroundColor: "green", // Set your desired background color for even lines
  });

const alternatingLineDecorationTypeRed =
  vscode.window.createTextEditorDecorationType({
    backgroundColor: "red", // Set your desired background color for odd lines
  });

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "safe-dep" is now active!');
  searchForPackageJsonFiles(vscode.workspace.rootPath!);

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "safe-dep.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage("Hello World from safe dep!");
    }
  );

  vscode.workspace.onDidChangeTextDocument(
    (e: vscode.TextDocumentChangeEvent) => {
      if (e.document.fileName.toLowerCase().endsWith("package.json")) {
        // Clear existing timeout if any
        if (timeout) {
          clearTimeout(timeout);
        }

        // Set a new timeout
        timeout = setTimeout(() => {
          // Run your function to search for package.json files
          searchForPackageJsonFiles(vscode.workspace.rootPath!);

          // Reset the timeout to null
          timeout = null;
        }, 2000);
      }
    }
  );

  let agree = vscode.commands.registerCommand("myExtension.agree", () => {
    // Do something when the agree button is clicked.
  });

  // Register a command for the disagree button.
  let disagree = vscode.commands.registerCommand("myExtension.disagree", () => {
    // Do something when the disagree button is clicked.
  });

  //trigger as soon as a project is opened
  vscode.workspace.onDidOpenTextDocument((e) => {
    // vscode.window.showInformationMessage("event triggered: ", e.fileName);
  });

  const agreeStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
  );
  agreeStatusBarItem.command = "myExtension.agree";

  // Create a status bar item for the disagree button.
  const disagreeStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
  );
  disagreeStatusBarItem.command = "myExtension.disagree";

  console.log(agreeStatusBarItem, disagreeStatusBarItem);

  setTimeout(() => {
    agreeStatusBarItem.show();
    disagreeStatusBarItem.show();
    console.log("showing");
  }, 2000);

  context.subscriptions.push(disposable);
  context.subscriptions.push(agree);
  context.subscriptions.push(disagree);
}

function searchForPackageJsonFiles(folderPath: string) {
  //   vscode.window.showInformationMessage("event triggered: ", folderPath);
  // Use the 'fs' module to search for package.json files recursively
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      return;
    }

    //if the current folder is node_modules, return
    if (folderPath.includes("node_modules")) {
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(folderPath, file);

      fs.stat(filePath, (err, stats) => {
        if (err) {
          return;
        }

        if (stats.isDirectory()) {
          // If it's a directory, search for package.json files recursively
          searchForPackageJsonFiles(filePath);
        } else if (file === "package.json") {
          // vscode.window.showInformationMessage(
          //   "package json found: ",
          //   filePath
          // );

          fs.readFile(filePath, "utf8", async (err: any, data) => {
            if (err) {
              return;
            }
            // vscode.window.showInformationMessage(data, "ok");
            vscode.window.showInformationMessage(typeof data, "ok");
            let json = JSON.parse(data);
            const dependencies = json.dependencies;
            const devDependencies = json.devDependencies;
            const decorationsRed: vscode.DecorationOptions[] = [];
            const decorationsGreen: vscode.DecorationOptions[] = [];

            for (let key in dependencies) {
              console.log("key: ", key);
              const res: any = await axios.post(SERVER_URL + "/package", {
                packages: [key + ":" + dependencies[key]],
              });
              console.log("res: ", res.data);

              // const res = {
              //   data: {
              //     cloned: "0",
              //     features: "[0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 2905, 3923, 1]",
              //     finalPrediction: "benign",
              //     prediction: "benign",
              //     reproducible: "0",
              //   },
              // };

              let { features, ...rest } = res.data;
              //convert the string features to a number array
              let convertedFeatures = JSON.parse(features);
              let featureArray: number[] = [];
              console.log("rest: ", rest);
              for (const value of convertedFeatures) {
                featureArray.push(parseInt(value));
              }

              console.log("features: ", features, typeof features);

              let hoverMessage = "";
              hoverMessage += assignLabelToFeatures(featureArray);

              hoverMessage += "Prediction: " + res.data.prediction + "\n\n";
              hoverMessage += "Reproducible: " + res.data.reproducible + "\n\n";
              hoverMessage += "Cloned: " + res.data.cloned + "\n\n";
              hoverMessage +=
                "Final Prediction: " + res.data.finalPrediction + "\n\n";
              hoverMessage +=
                res.data.agreedVotes +
                " out of " +
                res.data.totalVotes +
                " people agreed with the prediction" +
                "\n\n";
              const url = `http://localhost:3000/?package_name=${key}&package_version=${dependencies[key]}`;
              hoverMessage += "\n\n[Click here to vote](" + url + ")";

              const { line, start, end } = findPackageInfo(
                data,
                key,
                dependencies[key]
              );

              if (line !== null && start !== null && end !== null) {
                const decoration = {
                  range: new vscode.Range(
                    new vscode.Position(line, start),
                    new vscode.Position(line, end)
                  ),
                  hoverMessage: hoverMessage,
                };
                if (
                  res.data.finalPrediction === "benign" ||
                  res.data.finalPrediction === "Benign"
                ) {
                  decorationsGreen.push(decoration);
                } else {
                  decorationsRed.push(decoration);
                }
                decorationsMap[`${key}:${dependencies[key]}`] = decoration;
              }

              vscode.window.activeTextEditor?.setDecorations(
                alternatingLineDecorationType,
                decorationsGreen
              );
              vscode.window.activeTextEditor?.setDecorations(
                alternatingLineDecorationTypeRed,
                decorationsRed
              );
              // console.log("res: ", res.data);
            }

            try {
              const packageJson = JSON.parse(data);
              // Do something with the package.json data
              console.log("Found package.json:", packageJson.name);
              vscode.window.showInformationMessage(packageJson, "ok");
            } catch (err) {
              console.error("Error parsing package.json:", err);
            }
          });
        }
      });
    });
  });
}

function findPackageInfo(
  data: string,
  packageName: string,
  packageVersion: string
): { line: number | null; start: number | null; end: number | null } {
  const lines = data.split("\n");

  for (let line = 1; line <= lines.length; line++) {
    const currentLine = lines[line - 1];
    const startIndex = currentLine.indexOf(packageName);
    if (startIndex !== -1) {
      const endIndex =
        startIndex + packageName.length + packageVersion.length + 5; // 5 is for the quotes and the colon
      if (currentLine.includes(packageVersion, startIndex)) {
        return { line: line - 1, start: startIndex, end: endIndex };
      }
    }
  }

  // Package name and version not found
  return { line: null, start: null, end: null };
}

function assignLabelToFeatures(features: number[]): string {
  let stringifiedLabels: string = "";

  for (let i = 0; i < features.length - 3; i++) {
    stringifiedLabels +=
      featureNames[i] + " : " + (features[i] ? "Yes" : "No") + "\n\n";
  }
  stringifiedLabels +=
    featureNames[featureNames.length - 3] +
    " : " +
    features[features.length - 3] +
    "\n\n";
  stringifiedLabels +=
    featureNames[featureNames.length - 2] +
    " : " +
    features[features.length - 2] +
    "\n\n";
  stringifiedLabels +=
    featureNames[features.length - 1] +
    " : " +
    (features[features.length - 1] ? "Yes" : "No") +
    "\n\n";
  return stringifiedLabels;
}

// This method is called when your extension is deactivated
export function deactivate() {}
