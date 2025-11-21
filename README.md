📘 3D Cloth Simulation — Cutting, Tension, Gravity, Thickness

A fully interactive 3D cloth simulation implemented in HTML5 Canvas + JavaScript.
Features realistic cloth physics, cutting mechanics, 3D rotation, thickness layers, and full gravity & tension control.

This project simulates a soft-body volumetric cloth that can be sliced like real fabric or skin.

🚀 Live Demo (GitHub Pages)

After you enable GitHub Pages, your simulation will be live at:

https://likhithirani.github.io/Cloth-simulation/

🎯 Features
🧵 Realistic Cloth Physics

Soft-body fabric behavior

Verlet integration

Bending constraints for smooth folds

Damping + air drag for natural movement

✂️ Advanced Cutting System

Click-and-drag to cut

Surface cuts, half-depth cuts, or full-thickness cuts

Cuts react to tension (holes expand or close)

Volume sticks break for a real 3D tear

⚙️ User Controls (UI)
Control	Description
Tension	Pulls fabric outward, widens cuts
Gravity Toggle	Turn gravity ON / OFF
Gravity Strength	Adjust gravity (0–200%)
Cut Depth	Control cut penetration (surface → full depth)
3D Rotation	Rotate cloth left/right
Reset	Resets cloth to original state
🧱 Volumetric Thickness

Cloth is built from 6 layered slices

Layers are interconnected to simulate real depth

Allows realistic thick cuts, wounds, and separation

🌀 3D View (Canvas Projection)

Rotate cloth from -180° to +180°

Depth shading for realism

No external libraries required

📁 Project Structure
/Cloth-simulation
│── index.html      → UI layout + canvas
│── style.css       → Sidebar UI styling
│── script.js       → Entire cloth physics engine
│── README.md       → (You are here)

🛠 How to Run

Just open index.html in any browser:

Chrome → File → Open File → index.html


or double-click the file.

No server, frameworks, or install required.

🧑‍💻 Technologies Used

JavaScript (Vanilla)

HTML5 Canvas

CSS3

Verlet Physics

Custom 3D Projection Math

🎮 Controls

Drag mouse → Cut the cloth

Sidebar sliders → Adjust tension, gravity, cut depth

Rotate slider → Spin cloth in 3D

Reset → Restore cloth

📸 Screenshots

(Add your own screenshots later here)

<img src="screenshot1.png" width="500">
<img src="screenshot2.png" width="500">

🌐 Deploying via GitHub Pages

Open your repo

Go to Settings → Pages

Set:

Source: Deploy from branch

Branch: main

Folder: /(root)

Save

Wait 30 seconds

Your cloth simulation will be publicly live!

💡 Future Improvements (Optional)

If you want next-level realism:

Wind simulation

Pressure-based cutting (blade force)

Multiple materials (skin, leather, cotton, rubber)

GPU-accelerated cloth (WebGL compute)

Self-collision physics

I can implement any of these for you.

👤 Author

Likhith M Irani
PES University
Computer Science
