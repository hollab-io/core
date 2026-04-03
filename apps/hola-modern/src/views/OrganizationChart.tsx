import { motion } from 'framer-motion';

type BubbleType = 'bg' | 'primary' | 'secondary';

interface Node {
  id: string;
  label: string;
  r: number;
  type: BubbleType;
  x: number;
  y: number;
}

const data: Node[] = [
  { id: "ceo", label: "CEO", x: 500, y: 300, r: 60, type: "primary" },
  { id: "cto", label: "CTO", x: 390, y: 300, r: 50, type: "primary" },
  { id: "vision", label: "Vision", x: 610, y: 300, r: 50, type: "primary" },
  { id: "back_office", label: "Back Office\nCircle Rep", x: 450, y: 395, r: 40, type: "secondary" },
  { id: "holacracy", label: "Holacracy\nSummit\nProject", x: 550, y: 395, r: 35, type: "secondary" },
  { id: "product", label: "Product", x: 260, y: 500, r: 55, type: "primary" },
  { id: "trans", label: "Translation\nExpert", x: 260, y: 413, r: 30, type: "secondary" },
  { id: "dev_be", label: "Development\nBack End", x: 321.5, y: 438.5, r: 30, type: "secondary" },
  { id: "dev_fe", label: "Developer\nFront End", x: 347, y: 500, r: 30, type: "secondary" },
  { id: "infra", label: "Infrastructure\n& Security", x: 321.5, y: 561.5, r: 30, type: "secondary" },
  { id: "pm", label: "Product\nManager", x: 260, y: 587, r: 30, type: "secondary" },
  { id: "dev_mgr", label: "Development\nManager", x: 198.5, y: 561.5, r: 30, type: "secondary" },
  { id: "design", label: "Design", x: 173, y: 500, r: 30, type: "secondary" },
  { id: "mobile", label: "Mobile app", x: 198.5, y: 438.5, r: 30, type: "secondary" },
  { id: "ee", label: "Employee\nExperience", x: 500, y: 700, r: 55, type: "primary" },
  { id: "onb", label: "Onboarding", x: 500, y: 615, r: 28, type: "secondary" },
  { id: "comp", label: "Compensation\nArchitect", x: 546, y: 628.5, r: 28, type: "secondary" },
  { id: "ho", label: "Happiness\nOfficer", x: 577.3, y: 664.7, r: 28, type: "secondary" },
  { id: "dei", label: "DEI\nChampion", x: 584.1, y: 712.1, r: 28, type: "secondary" },
  { id: "ld", label: "Learning &\nDevelopment", x: 564.2, y: 755.7, r: 28, type: "secondary" },
  { id: "ma", label: "Members\nAssembly", x: 523.9, y: 781.6, r: 28, type: "secondary" },
  { id: "cr", label: "Circle\nRep", x: 476.1, y: 781.6, r: 28, type: "secondary" },
  { id: "rec", label: "Recruitment", x: 435.8, y: 755.7, r: 28, type: "secondary" },
  { id: "hr", label: "Human\nResources", x: 415.9, y: 712.1, r: 28, type: "secondary" },
  { id: "training", label: "Training\nExpert", x: 422.7, y: 664.7, r: 28, type: "secondary" },
  { id: "div", label: "Diversity\n&\nInclusion", x: 454, y: 628.5, r: 28, type: "secondary" },
  { id: "growth", label: "Growth\nCircle\nRep", x: 740, y: 500, r: 45, type: "primary" },
  { id: "marketing", label: "Marketing", x: 740, y: 423, r: 30, type: "secondary" },
  { id: "sales", label: "Sales", x: 806.7, y: 538.5, r: 30, type: "secondary" },
  { id: "cs", label: "Customer\nServices", x: 673.3, y: 538.5, r: 30, type: "secondary" }
];

const clusterBGs = [
  { id: "bg_leaders", x: 500, y: 345, r: 175 },
  { id: "bg_prod", x: 260, y: 500, r: 130 },
  { id: "bg_ee", x: 500, y: 698, r: 126 },
  { id: "bg_gr", x: 740, y: 485, r: 115 }
];

function Bubble({ node, searchQuery }: { node: Node; searchQuery: string }) {
  const normSearch = searchQuery.toLowerCase().trim();
  const isMatch = !!(normSearch && node.label.toLowerCase().includes(normSearch));
  const isDimmed = !!(normSearch && !isMatch);

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={false}
      // Set fixed positioning directly to style instead of animate, 
      // letting framer-motion fully control `x` and `y` natively during drag
      style={{
        width: node.r * 2,
        height: node.r * 2,
        left: node.x - node.r,
        top: node.y - node.r,
      }}
      animate={{
        opacity: isDimmed ? 0.3 : 1,
        scale: isMatch ? 1.15 : 1,
      }}
      whileHover={{ scale: 1.05 }}
      whileDrag={{ scale: 1.1, zIndex: 100 }}
      className={`absolute flex items-center justify-center rounded-full text-center cursor-move transition-opacity duration-300 ${
        isMatch ? 'ring-4 ring-yellow-400' : ''
      } ${
        node.type === 'primary' 
          ? 'bg-[#3481FF] text-white font-semibold' 
          : 'bg-[#ADD2FB] dark:bg-blue-500/30 text-[#1a5198] dark:text-blue-100 font-medium'
      }`}
    >
      <span className="whitespace-pre-line leading-tight px-1 select-none" style={{ fontSize: node.r / 3 }}>
        {node.label}
      </span>
    </motion.div>
  );
}

export default function OrganizationChart({ searchQuery = "" }: { searchQuery?: string }) {
  return (
    <section className="relative h-full w-full overflow-hidden bg-white dark:bg-slate-900 transition-colors duration-300 select-none flex flex-col">
      <div className="p-8 pb-0">
        <h2 className="text-[20px] font-normal text-slate-600 dark:text-slate-400">Holaspiriters</h2>
      </div>

      <div className="flex-1 relative overflow-hidden flex items-center justify-center" style={{ minHeight: 0 }}>
        <div style={{ 
          transform: 'scale(0.8)',
          width: '1000px', 
          height: '1000px',
          position: 'relative',
        }}>
          {/* Cluster Backgrounds */}
          {clusterBGs.map(bg => (
            <div
              key={bg.id}
              className="absolute rounded-full bg-[#F4F8FF] dark:bg-slate-800/50 border border-[#E5EEFF] dark:border-slate-700 transition-colors duration-300 pointer-events-none"
              style={{
                width: bg.r * 2,
                height: bg.r * 2,
                left: bg.x - bg.r,
                top: bg.y - bg.r,
              }}
            />
          ))}

          {/* Bubbles */}
          {data.map(node => (
            <Bubble key={node.id} node={node} searchQuery={searchQuery} />
          ))}
        </div>
      </div>
    </section>
  );
}
