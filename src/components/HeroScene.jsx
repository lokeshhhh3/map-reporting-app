// ---------------------------------------------------------------------------
// HeroScene -- the illustrated landscape behind the homepage's floating cards.
// Hand-drawn SVG so there is no image to download and it stays crisp on any
// screen: a muted sky, soft clouds, layered hills, a small campus skyline and
// a dashed route with three pins (the same idea as the reference design).
// ---------------------------------------------------------------------------
export default function HeroScene() {
  return (
    <svg
      className="hero-scene"
      viewBox="0 0 1440 820"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="heroSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b8cdd0" />
          <stop offset="58%" stopColor="#cddcd9" />
          <stop offset="100%" stopColor="#e4e6d6" />
        </linearGradient>
        <linearGradient id="hillFar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b8c4a4" />
          <stop offset="100%" stopColor="#a3b28c" />
        </linearGradient>
        <linearGradient id="hillMid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93a476" />
          <stop offset="100%" stopColor="#7e9064" />
        </linearGradient>
        <linearGradient id="hillNear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7d8f60" />
          <stop offset="100%" stopColor="#5f7248" />
        </linearGradient>
        <linearGradient id="meadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c9d5a8" />
          <stop offset="100%" stopColor="#d8e0b6" />
        </linearGradient>
        <radialGradient id="sunGlow" cx="0.28" cy="0.18" r="0.6">
          <stop offset="0%" stopColor="#f6f2e2" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#f6f2e2" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1440" height="820" fill="url(#heroSky)" />
      <rect width="1440" height="820" fill="url(#sunGlow)" />

      {/* clouds */}
      <g fill="#f7f5ee" opacity="0.92">
        <ellipse cx="360" cy="196" rx="118" ry="46" />
        <ellipse cx="424" cy="170" rx="86" ry="38" />
        <ellipse cx="296" cy="176" rx="70" ry="30" />
        <ellipse cx="1092" cy="132" rx="96" ry="34" />
        <ellipse cx="1160" cy="150" rx="66" ry="26" />
        <ellipse cx="620" cy="98" rx="58" ry="22" opacity="0.7" />
      </g>

      {/* far hills */}
      <path
        d="M0 470 C 140 400, 250 430, 360 402 C 470 374, 540 320, 650 330 C 760 340, 840 400, 960 386 C 1080 372, 1180 320, 1290 336 C 1360 346, 1410 366, 1440 356 L1440 820 L0 820 Z"
        fill="url(#hillFar)"
        opacity="0.8"
      />

      {/* the big central hill */}
      <path
        d="M470 820 C 520 660, 610 520, 760 430 C 830 386, 900 360, 960 372 C 1040 388, 1080 452, 1110 520 C 1146 600, 1180 720, 1200 820 Z"
        fill="url(#hillMid)"
      />
      <path
        d="M700 820 C 740 690, 790 590, 880 520 C 930 482, 980 470, 1010 486 C 1052 508, 1074 566, 1086 640 C 1096 700, 1104 770, 1108 820 Z"
        fill="url(#hillNear)"
        opacity="0.92"
      />

      {/* contour lines on the hill */}
      <g stroke="#5c6b45" strokeWidth="1.4" fill="none" opacity="0.28">
        <path d="M760 800 C 800 700, 850 610, 930 552" />
        <path d="M840 812 C 872 720, 916 640, 986 590" />
        <path d="M700 812 C 748 706, 800 622, 872 570" />
      </g>

      {/* little trees on the slope */}
      <g fill="#4e5f3c" opacity="0.75">
        {[
          [786, 646, 5],
          [820, 612, 4],
          [850, 580, 5],
          [806, 690, 4],
          [872, 556, 4],
          [906, 524, 5],
          [748, 706, 4],
          [934, 500, 4],
          [960, 476, 5],
          [700, 752, 4],
        ].map(([cx, cy, r], index) => (
          <g key={index}>
            <circle cx={cx} cy={cy} r={r * 1.6} />
            <rect x={cx - 0.8} y={cy + r} width="1.6" height="7" />
          </g>
        ))}
      </g>

      {/* flower field on the left slope */}
      <g>
        <ellipse cx="330" cy="596" rx="210" ry="86" fill="#a9b98a" opacity="0.55" />
        {[
          [214, 566, '#e8a0b4'],
          [252, 590, '#efe7cf'],
          [292, 566, '#c9a8d8'],
          [330, 604, '#e8a0b4'],
          [372, 578, '#efe7cf'],
          [410, 600, '#c9a8d8'],
          [448, 572, '#e8a0b4'],
          [268, 622, '#efe7cf'],
          [352, 632, '#c9a8d8'],
          [430, 626, '#efe7cf'],
          [190, 606, '#c9a8d8'],
          [476, 612, '#efe7cf'],
        ].map(([cx, cy, fill], index) => (
          <circle key={index} cx={cx} cy={cy} r="5.5" fill={fill} opacity="0.95" />
        ))}
      </g>

      {/* campus skyline: simple cream blocks with lime roofs */}
      <g>
        <rect x="1080" y="492" width="86" height="120" rx="4" fill="#f4efe2" />
        <rect x="1080" y="486" width="86" height="10" rx="5" fill="#c7d2af" />
        <rect x="1176" y="524" width="62" height="88" rx="4" fill="#eee9da" />
        <rect x="1176" y="518" width="62" height="9" rx="4.5" fill="#c7d2af" />
        <rect x="1004" y="540" width="64" height="72" rx="4" fill="#f7f3e7" />
        <rect x="1004" y="534" width="64" height="9" rx="4.5" fill="#d8c9a2" />
        <g fill="#8f9a7a" opacity="0.6">
          <rect x="1096" y="512" width="10" height="10" rx="2" />
          <rect x="1118" y="512" width="10" height="10" rx="2" />
          <rect x="1140" y="512" width="10" height="10" rx="2" />
          <rect x="1096" y="536" width="10" height="10" rx="2" />
          <rect x="1118" y="536" width="10" height="10" rx="2" />
          <rect x="1140" y="536" width="10" height="10" rx="2" />
          <rect x="1190" y="542" width="9" height="9" rx="2" />
          <rect x="1210" y="542" width="9" height="9" rx="2" />
          <rect x="1018" y="556" width="9" height="9" rx="2" />
          <rect x="1038" y="556" width="9" height="9" rx="2" />
        </g>
      </g>

      {/* meadow foreground + hedge line */}
      <path
        d="M0 690 C 180 650, 320 676, 470 700 C 620 724, 760 736, 900 748 C 1060 762, 1240 748, 1440 716 L1440 820 L0 820 Z"
        fill="url(#meadow)"
      />
      <path
        d="M0 700 C 200 664, 340 690, 480 712 C 640 736, 780 748, 920 758 C 1080 770, 1240 756, 1440 728"
        stroke="#ffffff"
        strokeWidth="2.5"
        fill="none"
        opacity="0.55"
      />

      {/* small bushes and flowers in the foreground */}
      <g fill="#8ea36a" opacity="0.85">
        <ellipse cx="120" cy="742" rx="46" ry="20" />
        <ellipse cx="196" cy="758" rx="34" ry="15" />
        <ellipse cx="1330" cy="756" rx="54" ry="22" />
        <ellipse cx="1258" cy="770" rx="30" ry="13" />
      </g>
      <g>
        {[
          [86, 760, '#e8a0b4'],
          [158, 776, '#efe7cf'],
          [228, 782, '#c9a8d8'],
          [1300, 782, '#e8a0b4'],
          [1380, 770, '#efe7cf'],
          [1234, 790, '#c9a8d8'],
          [520, 792, '#efe7cf'],
          [600, 800, '#e8a0b4'],
        ].map(([cx, cy, fill], index) => (
          <circle key={index} cx={cx} cy={cy} r="6" fill={fill} />
        ))}
      </g>

      {/* dashed route with three pins */}
      <path
        d="M1010 300 C 1046 246, 1006 208, 962 196 C 906 180, 866 226, 886 282 C 906 338, 962 356, 986 410 C 1004 450, 974 486, 940 500"
        stroke="#4b4c3c"
        strokeWidth="3"
        strokeDasharray="9 10"
        fill="none"
        strokeLinecap="round"
        opacity="0.85"
      />

      <g className="hero-pin hero-pin--white">
        <line x1="962" y1="176" x2="962" y2="212" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
        <circle cx="962" cy="158" r="24" fill="#fdfbf6" stroke="#ffffff" strokeWidth="2" />
        <path d="M950 162 l8 -12 l8 12 z" fill="#4b4c3c" />
      </g>

      <g className="hero-pin hero-pin--lime">
        <line x1="886" y1="300" x2="886" y2="336" stroke="#d2de73" strokeWidth="4" strokeLinecap="round" />
        <circle cx="886" cy="282" r="24" fill="#e3ea8d" />
        <path d="M874 286 l8 -12 l8 12 z" fill="#4c5c1f" />
      </g>

      <g className="hero-pin hero-pin--coral">
        <line x1="940" y1="518" x2="940" y2="556" stroke="#e4775e" strokeWidth="4" strokeLinecap="round" />
        <circle cx="940" cy="500" r="24" fill="#e4775e" />
        <path d="M928 504 l8 -12 l8 12 z" fill="#fdf6f2" />
      </g>
    </svg>
  )
}
