import { Titlebar } from "custom-electron-titlebar";

window.addEventListener("DOMContentLoaded", () => {
  const options = {
    backgroundColor: TitlebarColor.fromHex("#FF0000"),
    titleHorizontalAlignment: "center",
  };
  new Titlebar(options);
});
