import ReactGA from "react-ga4";

export const initGA = () => {
  ReactGA.initialize("G-9SZYY6T1FS");
};

export const trackSlam = () => {
  ReactGA.event({
    category: "Game",
    action: "Crush_Em_Click",
    label: "Play_Button",
  });
};

export const trackClout = () => {
  ReactGA.event({
    category: "Social",
    action: "Share_Score_Click",
    label: "Share_Button",
  });
};

export const trackPageView = (page: string) => {
  ReactGA.send({ hitType: "pageview", page });
};
