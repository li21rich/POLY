import SlideIn from "../../components/SlideIn";

const TEAM = [
  {
    name: "Richard Li",
    role: "Software · Firmware",
    linkedin: "https://www.linkedin.com/in/richard-h-li/",
    email: "richardhli81 at gmail dot com",
  },
  {
    name: "Shaashwat Sahoo",
    role: "Electrical",
    linkedin: "https://www.linkedin.com/in/shaashwat-sahoo/",
    email: "sahoo9 at wisc dot edu",
  },
  {
    name: "Arthur Gabrilovich",
    role: "Mechanical",
    linkedin: "https://www.linkedin.com/in/arthurgabrilovich/",
    email: "agabr at purdue dot edu",
  },
  {
    name: "Keegan Lee",
    role: "Electrical",
    linkedin: "https://www.linkedin.com/in/keegan-lee-649a35381/",
    email: "keeganlee842 at gmail dot com",
  },
];

const Contact = () => {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center px-6 py-24 text-white">
      <SlideIn direction="top" delay={100} duration={800}>
        <div className="text-center mb-20">
          <p className="text-white/40 text-xs tracking-[0.3em] uppercase mb-3">we call ourselves</p>
          <h1 className="text-7xl font-bold text-primary-reddish tracking-tight">
            BOILING POT
          </h1>
        </div>
      </SlideIn>

      <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-6">
        {TEAM.map((member, i) => (
          <SlideIn key={member.name} direction="bottom" delay={200 + i * 100} duration={800}>
            <div className="border border-white/10 rounded-xl p-6 flex flex-col gap-4 hover:border-primary-reddish/40 transition-colors duration-300">
              <div>
                <p className="text-white font-bold text-xl tracking-wide">{member.name}</p>
                <p className="text-primary-reddish text-xs tracking-widest uppercase mt-1 opacity-80">{member.role}</p>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex flex-col gap-2">
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn
                </a>
                <a
                  href={`mailto:${member.email}`}
                  className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  {member.email}
                </a>
              </div>
            </div>
          </SlideIn>
        ))}
      </div>
    </div>
  );
};

export default Contact;