#!/usr/bin/env bash
# VS Chamber Orchestra 2 Community Edition (CC0, Versilian Studios): real orchestral samples for scripts/sampler.py.
# Downloads the XRNI release (776 MB) and unpacks the instruments the scores use into work/samples/x/<Instrument>/.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p work/samples/dl
NEED="ViolinEnsSusVib ViolinEnsSusVib-Quiet ViolaEnsSusVib CelloEnsSusVib CelloEnsSusVib-Quiet ContrabassSusVB ContrabassSusVB-Quiet FHornSus TromboneSus TubaSus OrganLoud OrganLoudPedal OrganQuiet OrganQuietPedal Timpani TimpaniRolls UprightPiano TubularBells Harp ViolinEnsTrem CelloEnsTrem GM-StylePerc"
missing=0; for i in $NEED; do [ -d "work/samples/x/$i" ] || missing=1; done
[ $missing = 0 ] && { echo "samples in work/samples/x"; exit 0; }
[ -f work/samples/dl/vsco.zip ] || curl -sS -o work/samples/dl/vsco.zip https://s3.amazonaws.com/VersilianStudios/VSCO-2.1-XRNI-20170216.zip
for i in ViolinEnsSusVib ViolinEnsSusVib-Quiet ViolaEnsSusVib CelloEnsSusVib CelloEnsSusVib-Quiet ContrabassSusVB ContrabassSusVB-Quiet \
         FHornSus TromboneSus TubaSus OrganLoud OrganLoudPedal OrganQuiet OrganQuietPedal Timpani TimpaniRolls UprightPiano TubularBells \
         Harp ViolinEnsTrem CelloEnsTrem GM-StylePerc; do
  [ -d "work/samples/x/$i" ] && continue
  mkdir -p "work/samples/x/$i"
  python3 -I -c "import zipfile,sys,io; z=zipfile.ZipFile('work/samples/dl/vsco.zip'); zipfile.ZipFile(io.BytesIO(z.read(sys.argv[1]+'.xrni'))).extractall('work/samples/x/'+sys.argv[1])" "$i"
done
echo "samples in work/samples/x"
