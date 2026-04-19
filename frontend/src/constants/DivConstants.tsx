import POLYSENSE from "../assets/sens.jpg";
import POLYONE from "../assets/abc.jpg";
import POLYHOST from "../assets/host.jpg";
import POLYTWOS from "../assets/image-removebg-preview.png";

export interface ProjectPanel {
  title: string;
  image: string;
  stack?: string[];
  unreleased?: boolean;
}

export const PORTFOLIO_PROJECTS: ProjectPanel[] = [
  {
    title: "POLY Host",
    image: POLYHOST,
    stack: ["Wi-Fi", "LED", "Button"],
  },
  {
    title: "POLY One",
    image: POLYONE,
    stack: ["Servo", "LED", "Button"],
  },
  {
    title: "Poly Sense",
    image: POLYSENSE,
    stack: ["3-DOF Gyro", "3-DOF Accel", "LED", "Button"],
  },
  {
  title: "POLY Two S",
  image: POLYTWOS,
  stack: ["Servo", "Camera F", "Camera B", "Infrared"],
  unreleased: true,
  }
];