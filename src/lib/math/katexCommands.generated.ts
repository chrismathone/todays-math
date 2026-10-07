/**
 * 생성물 — 손으로 고치지 말 것. `npx tsx scripts/qa/gen-katex-commands.ts` 가 만든다.
 * 원천·제외 규칙: `scripts/qa/katexCommandCensus.ts`.
 * 동기화 시험: `src/__tests__/unit/katexCommands.sync.test.ts` (KaTeX 를 올리면 운다).
 *
 * KaTeX 가 수식 모드에서 붉은 글자 없이 그리는 명령 이름(역슬래시 뺌, 공백 구분).
 */
export const KATEX_COMMANDS_VERSION = "0.18.2";

export const KATEX_COMMAND_NAMES =
  "AA Alpha And Bbb Bbbk Beta Box Bra Braket Bumpeq Cap Chi Colonapprox Coloneq " +
  "Coloneqq Colonsim Complex Cup Dagger Darr Delta Diamond Doteq Downarrow " +
  "Epsilon Eqcolon Eqqcolon Eta Finv Game Gamma Harr Im Iota Join KaTeX Kappa " +
  "Ket LaTeX Lambda Larr Leftarrow Leftrightarrow Lleftarrow Longleftarrow " +
  "Longleftrightarrow Longrightarrow Lrarr Lsh Mu Nu Omega Omicron " +
  "Overrightarrow Phi Pi Pr Psi Rarr Re Reals Rho Rightarrow Rrightarrow Rsh " +
  "Set Sigma Subset Supset Tau TeX TextOrMath Theta Uarr Uparrow Updownarrow " +
  "Upsilon Vdash Vert Vvdash Xi Zeta aa acute alef alefsym aleph allowbreak " +
  "alpha amalg angl angle angln approx approxcolon approxcoloncolon approxeq " +
  "arccos arcctg arcsin arctan arctg arg argmax argmin ast asymp atop " +
  "backepsilon backprime backsim backsimeq backslash bar barwedge bcancel " +
  "because beta beth between bf bigcap bigcirc bigcup bigodot bigoplus " +
  "bigotimes bigsqcup bigstar bigtriangledown bigtriangleup biguplus bigvee " +
  "bigwedge binom blacklozenge blacksquare blacktriangle blacktriangledown " +
  "blacktriangleleft blacktriangleright blue blueA blueB blueC blueD blueE bm " +
  "bmod bold boldsymbol bot bowtie boxdot boxed boxminus boxplus boxtimes bra " +
  "brace brack braket breve bull bullet bumpeq cal cancel cap cdot cdotp cdots " +
  "centerdot cfrac ch check checkmark chi choose circ circeq circlearrowleft " +
  "circlearrowright circledR circledS circledast circledcirc circleddash clap " +
  "clubs clubsuit cnums colon colonapprox coloncolon coloncolonapprox " +
  "coloncolonequals coloncolonminus coloncolonsim coloneq coloneqq colonequals " +
  "colonminus colonsim color colorbox complement cong coprod copyright cos " +
  "cosec cosh cot cotg coth csc ctg cth cup curlyeqprec curlyeqsucc curlyvee " +
  "curlywedge curvearrowleft curvearrowright dArr dag dagger daleth darr " +
  "dashleftarrow dashrightarrow dashv dbinom dblcolon ddag ddagger ddddot dddot " +
  "ddot ddots deg degree delta det dfrac diagdown diagup diamond diamonds " +
  "diamondsuit digamma dim displaystyle div divideontimes dot doteq doteqdot " +
  "dotplus dots dotsb dotsc dotsi dotsm dotso dotsx doublebarwedge doublecap " +
  "doublecup downarrow downdownarrows downharpoonleft downharpoonright ell emph " +
  "empty emptyset enskip enspace epsilon eqcirc eqcolon eqqcolon eqsim " +
  "eqslantgtr eqslantless equalscolon equalscoloncolon equiv errmessage eta eth " +
  "exist exists exp fallingdotseq fbox flat forall frac frak frown gamma gcd ge " +
  "geq geqq geqslant gets gg ggg gggtr gimel gnapprox gneq gneqq gnsim goldA " +
  "goldB goldC goldD goldE grave gray grayA grayB grayC grayD grayE grayF grayG " +
  "grayH grayI green greenA greenB greenC greenD greenE gt gtrapprox gtrdot " +
  "gtreqless gtreqqless gtrless gtrsim gvertneqq hArr harr hat hbar hbox hearts " +
  "heartsuit hom hookleftarrow hookrightarrow hphantom hslash iff iiint iint " +
  "image imageof imath impliedby implies in inf infin infty injlim int intercal " +
  "intop iota isin it jmath kaBlue kaGreen kappa ker ket lArr lBrace lVert " +
  "lambda land lang langle larr lbrace lbrack lceil ldotp ldots le leadsto " +
  "leftarrow leftarrowtail leftharpoondown leftharpoonup leftleftarrows " +
  "leftrightarrow leftrightarrows leftrightharpoons leftrightsquigarrow " +
  "leftthreetimes leq leqq leqslant lessapprox lessdot lesseqgtr lesseqqgtr " +
  "lessgtr lesssim lfloor lg lgroup lhd lim liminf limsup ll llap llbracket " +
  "llcorner lll llless lmoustache ln lnapprox lneq lneqq lnot lnsim log " +
  "longleftarrow longleftrightarrow longmapsto longrightarrow looparrowleft " +
  "looparrowright lor lozenge lparen lq lrArr lrarr lrcorner lt ltimes lvert " +
  "lvertneqq maltese mapsto maroonA maroonB maroonC maroonD maroonE mathbb " +
  "mathbf mathbin mathcal mathclap mathclose mathellipsis mathfrak mathinner " +
  "mathit mathllap mathnormal mathop mathopen mathord mathpunct mathrel " +
  "mathring mathrlap mathrm mathscr mathsf mathsfit mathsterling mathstrut " +
  "mathtt max measuredangle medspace message mho mid min mintA mintB mintC " +
  "minuscolon minuscoloncolon minuso mod models mp mu multimap nLeftarrow " +
  "nLeftrightarrow nRightarrow nVDash nVdash nabla natnums natural ncong ne " +
  "nearrow neg negmedspace negthickspace negthinspace neq nexists ngeq ngeqq " +
  "ngeqslant ngtr ni nleftarrow nleftrightarrow nleq nleqq nleqslant nless nmid " +
  "nobreak nobreakspace not notin notni nparallel nprec npreceq nrightarrow " +
  "nshortmid nshortparallel nsim nsubseteq nsubseteqq nsucc nsucceq nsupseteq " +
  "nsupseteqq ntriangleleft ntrianglelefteq ntriangleright ntrianglerighteq nu " +
  "nvDash nvdash nwarrow odot oiiint oiint oint omega omicron ominus " +
  "operatorname operatornamewithlimits oplus orange ordinarycolon origof oslash " +
  "otimes over overbrace overbracket overgroup overleftarrow overleftharpoon " +
  "overleftrightarrow overline overlinesegment overrightarrow overrightharpoon " +
  "overset owns parallel partial perp phantom phase phi pi pink pitchfork plim " +
  "plusmn pm pmb pmod pod pounds prec precapprox preccurlyeq preceq precnapprox " +
  "precneqq precnsim precsim prime prod projlim propto psi purple purpleA " +
  "purpleB purpleC purpleD purpleE qquad quad rArr rBrace rVert rang rangle " +
  "rarr ratio rbrace rbrack rceil real reals red redA redB redC redD redE " +
  "restriction rfloor rgroup rhd rho rightarrow rightarrowtail rightharpoondown " +
  "rightharpoonup rightleftarrows rightleftharpoons rightrightarrows " +
  "rightsquigarrow rightthreetimes risingdotseq rlap rm rmoustache rparen rq " +
  "rrbracket rtimes rvert scriptscriptstyle scriptstyle sdot searrow sec sect " +
  "set setminus sf sh sharp shortmid shortparallel sigma sim simcolon " +
  "simcoloncolon simeq sin sinh smallfrown smallint smallsetminus smallsmile " +
  "smash smile sout space spades spadesuit sphericalangle sqcap sqcup sqrt " +
  "sqsubset sqsubseteq sqsupset sqsupseteq square stackrel star sub sube subset " +
  "subseteq subseteqq subsetneq subsetneqq substack succ succapprox succcurlyeq " +
  "succeq succnapprox succneqq succnsim succsim sum sup supe supset supseteq " +
  "supseteqq supsetneq supsetneqq surd swarrow tan tanh tau tbinom tealA tealB " +
  "tealC tealD tealE text textbf textcircled textcolor textcopyright textit " +
  "textmd textnormal textregistered textrm textsf textstyle texttt textup tfrac " +
  "tg th therefore theta thetasym thickapprox thicksim thickspace thinspace " +
  "tilde times to top triangle triangledown triangleleft trianglelefteq " +
  "triangleq triangleright trianglerighteq tt twoheadleftarrow " +
  "twoheadrightarrow uArr uarr ulcorner underbar underbrace underbracket " +
  "undergroup underleftarrow underleftrightarrow underline underlinesegment " +
  "underrightarrow underset unlhd unrhd uparrow updownarrow upharpoonleft " +
  "upharpoonright uplus upsilon upuparrows urcorner utilde vDash varDelta " +
  "varGamma varLambda varOmega varPhi varPi varPsi varSigma varTheta varUpsilon " +
  "varXi varepsilon varinjlim varkappa varliminf varlimsup varnothing varphi " +
  "varpi varprojlim varpropto varrho varsigma varsubsetneq varsubsetneqq " +
  "varsupsetneq varsupsetneqq vartheta vartriangle vartriangleleft " +
  "vartriangleright varvdots vcentcolon vcenter vdash vdots vec vee veebar vert " +
  "vphantom wedge weierp widecheck widehat widetilde wp wr xLeftarrow " +
  "xLeftrightarrow xRightarrow xcancel xhookleftarrow xhookrightarrow xi " +
  "xleftarrow xleftequilibrium xleftharpoondown xleftharpoonup xleftrightarrow " +
  "xleftrightharpoons xlongequal xmapsto xrightarrow xrightequilibrium " +
  "xrightharpoondown xrightharpoonup xrightleftarrows xrightleftharpoons " +
  "xtofrom xtwoheadleftarrow xtwoheadrightarrow yen zeta ";

/** `x \name y` 에서 관계·이항 기호로 서는 것 — 왼쪽 피연산자를 같이 감싼다. */
export const KATEX_INFIX_NAMES =
  "And Colonapprox Coloneq Coloneqq Colonsim Dagger Darr Downarrow Eqcolon " +
  "Eqqcolon Harr Join Larr Leftarrow Leftrightarrow Longleftarrow " +
  "Longleftrightarrow Longrightarrow Lrarr Rarr Rightarrow Uarr Uparrow " +
  "Updownarrow amalg approx approxcolon approxcoloncolon ast asymp bigcirc " +
  "bigtriangledown bigtriangleup bmod bowtie bull bullet cap cdot circ colon " +
  "colonapprox coloncolon coloncolonapprox coloncolonequals coloncolonminus " +
  "coloncolonsim coloneq coloneqq colonequals colonminus colonsim cong cup dArr " +
  "dagger darr dashv dblcolon ddagger diamond div doteq downarrow eqcolon " +
  "eqqcolon equalscolon equalscoloncolon equiv frown ge geq gets gg gt hArr " +
  "harr hookleftarrow hookrightarrow iff imageof impliedby implies in isin lArr " +
  "land larr le leftarrow leftharpoondown leftharpoonup leftrightarrow leq ll " +
  "longleftarrow longleftrightarrow longmapsto longrightarrow lor lrArr lrarr " +
  "lt mapsto mathrel mid minuscolon minuscoloncolon minuso models mp ne nearrow " +
  "neq ni not notin notni nwarrow odot ominus oplus ordinarycolon origof oslash " +
  "otimes owns parallel perp plusmn pm prec preceq propto rArr rarr ratio " +
  "rightarrow rightharpoondown rightharpoonup rightleftharpoons sdot searrow " +
  "setminus sim simcolon simcoloncolon simeq smile sqcap sqcup sqsubseteq " +
  "sqsupseteq star sub sube subset subseteq succ succeq supe supset supseteq " +
  "swarrow times to triangleleft triangleright uArr uarr uparrow updownarrow " +
  "uplus vcentcolon vdash vee wedge wr ";
