import ESP32Img from "../assets/esp32.png";
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
    image: ESP32Img,
    stack: ["Wi-Fi", "LED", "Button"],
  },
  {
    title: "POLY One",
    image: ESP32Img,
    stack: ["Servo", "LED", "Button"],
  },
  {
    title: "Poly Sense",
    image: ESP32Img,
    stack: ["3-DOF Gyro", "3-DOF Accel", "LED", "Button"],
  },
  {
  title: "POLY Two S",
  image: POLYTWOS,
  stack: ["Servo", "Camera F", "Camera B", "Infrared"],
  unreleased: true,
  }
];