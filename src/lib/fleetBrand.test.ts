import { describe, expect, it } from "vitest";
import { fleetClass, fleetColors, fleetPrefixes, fleetTagCss } from "./fleetBrand";

describe("fleetPrefixes", () => {
  it("uses the first two letters of each fleet", () => {
    const p = fleetPrefixes(["DHL", "UNIVEX", "GAMONAL", "PIAZZA"]);
    expect([...p]).toEqual([
      ["DHL", "DH"],
      ["GAMONAL", "GA"],
      ["PIAZZA", "PI"],
      ["UNIVEX", "UN"],
    ]);
  });

  it("lengthens the fleets that would start alike until they differ", () => {
    const p = fleetPrefixes(["GAMONAL", "GARDA", "GAMMA"]);
    expect(p.get("GAMONAL")).toBe("GAMO");
    expect(p.get("GARDA")).toBe("GAR");
    expect(p.get("GAMMA")).toBe("GAMM");
    expect(new Set(p.values()).size).toBe(3);
  });

  it("ignores case, repeats and blank names", () => {
    expect([...fleetPrefixes(["dhl", "DHL", " ", ""])]).toEqual([["DHL", "DH"]]);
  });
});

describe("fleetColors / fleetClass / fleetTagCss", () => {
  it("knows the clients' logo colours and gives the others a steady one", () => {
    expect(fleetColors("dhl")).toEqual({ bg: "#FFCC00", fg: "#D40511" });
    expect(fleetColors("UNIVEX")).toEqual(fleetColors("univex"));
  });

  it("builds one CSS rule per fleet", () => {
    const css = fleetTagCss(["DHL", "PIAZZA"]);
    expect(css).toContain(`.${fleetClass("DHL")}{--fleet-tag:"DH";--fleet-bg:#FFCC00;--fleet-fg:#D40511}`);
    expect(css).toContain(`.${fleetClass("PIAZZA")}{--fleet-tag:"PI"`);
  });
});
