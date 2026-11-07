# Werkzeug-Image für Disroop Motion One: alle Hardware-, CAD-, Slicer-, Render- und Dokumentationswerkzeuge
# ohne GUI. Bewusst getrennt vom Entwicklungs-Image (.devcontainer), damit Bridge-/App-CI schlank bleibt.
# Versionen wie auf dem Windows-Rechner (KiCad 10, FreeCAD 1.1, Blender 5.2), damit Dateien austauschbar sind.
# Bauen und benutzen: ./project hw image | ./project hw smoke | ./project hw sh
FROM ubuntu:24.04

ARG FREECAD_VERSION=1.1.4
ARG BLENDER_SERIES=5.2
ARG BLENDER_VERSION=5.2.3
ARG BAMBU_TAG=v02.09.01.70
ARG BAMBU_ASSET=BambuStudio_ubu24-v02.09.01.70-20261103183404.AppImage

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    QT_QPA_PLATFORM=offscreen

# --- Basis, Dokumentation (pandoc + xelatex), Simulation (ngspice), Video (ffmpeg), virtueller Bildschirm --------
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates curl git jq unzip xz-utils file software-properties-common gpg-agent \
        python3 python3-pip python3-venv \
        ffmpeg pandoc ngspice \
        texlive-xetex texlive-latex-recommended texlive-fonts-recommended texlive-lang-german lmodern fonts-dejavu fonts-noto-core \
        xvfb xauth \
    && rm -rf /var/lib/apt/lists/*

# --- KiCad 10 (kicad-cli: ERC/DRC, Gerber, BOM, Bestückungsdaten, 3D-Render) -------------------------------------
# Symbole und Footprints ja; die 3D-Modellbibliothek (mehrere GB) nicht - Modelle holt der Prompt gezielt.
RUN add-apt-repository -y ppa:kicad/kicad-10.0-releases \
    && apt-get update && apt-get install -y --no-install-recommends kicad kicad-symbols kicad-footprints \
    && rm -rf /var/lib/apt/lists/*

# --- FreeCAD 1.1 (freecadcmd: Gehäuse per Python-Skript, STEP/STL) ----------------------------------------------
RUN curl -fsSL -o /tmp/fc.AppImage \
        "https://github.com/FreeCAD/FreeCAD/releases/download/${FREECAD_VERSION}/FreeCAD_${FREECAD_VERSION}-Linux-x86_64-py311.AppImage" \
    && cd /opt && chmod +x /tmp/fc.AppImage && /tmp/fc.AppImage --appimage-extract >/dev/null \
    && mv squashfs-root freecad && chmod -R a+rX freecad && rm /tmp/fc.AppImage \
    && printf '#!/bin/sh\nexec /opt/freecad/AppRun freecadcmd "$@"\n' > /usr/local/bin/freecadcmd \
    && chmod +x /usr/local/bin/freecadcmd

# --- Blender 5.2 (blender -b: Produktrender, Explosionsansichten, Video) ------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
        libx11-6 libxi6 libxxf86vm1 libxfixes3 libxrender1 libxkbcommon0 libsm6 libgl1 libegl1 libglu1-mesa \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL "https://download.blender.org/release/Blender${BLENDER_SERIES}/blender-${BLENDER_VERSION}-linux-x64.tar.xz" \
       | tar -xJ -C /opt && mv /opt/blender-${BLENDER_VERSION}-linux-x64 /opt/blender \
    && ln -s /opt/blender/blender /usr/local/bin/blender

# --- Bambu Studio (Slicer für den Bambu Lab P2S, Kommandozeile unter xvfb) ----------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgtk-3-0t64 libwebkit2gtk-4.1-0 libgstreamer1.0-0 libgstreamer-plugins-base1.0-0 libosmesa6 libsecret-1-0 \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL -o /tmp/bs.AppImage "https://github.com/bambulab/BambuStudio/releases/download/${BAMBU_TAG}/${BAMBU_ASSET}" \
    && cd /opt && chmod +x /tmp/bs.AppImage && /tmp/bs.AppImage --appimage-extract >/dev/null \
    && mv squashfs-root bambu-studio && chmod -R a+rX bambu-studio && rm /tmp/bs.AppImage \
    && printf '#!/bin/sh\nexec xvfb-run -a /opt/bambu-studio/AppRun "$@"\n' > /usr/local/bin/bambu-studio \
    && chmod +x /usr/local/bin/bambu-studio

# --- Python-Helfer (Mesh-Prüfung der STL vor dem Slicen) ----------------------------------------------------------
RUN pip3 install --no-cache-dir --break-system-packages trimesh numpy

# --- Mechanik: CadQuery (parametrisches CAD), Gmsh (Vernetzung) und CalculiX (FEM) -------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends gmsh calculix-ccx libgl1 python-is-python3 \
    && rm -rf /var/lib/apt/lists/* \
    && pip3 install --no-cache-dir --break-system-packages cadquery gmsh meshio lxml

WORKDIR /workspace
