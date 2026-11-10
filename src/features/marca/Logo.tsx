/* eslint-disable @next/next/no-img-element */

/**
 * Logo: o PW com o entregador (sem o selo redondo). A cor segue o tema sozinha
 * pelo CSS: dourado no normal, violeta no modo teste, vermelho para o Dev.
 */
function Marca({ classe }: { classe: string }) {
  return (
    <span className={`marca ${classe}`} aria-hidden>
      <img src="/marca/pw-ouro.png" alt="" className="marca-v marca-ouro" />
      <img src="/marca/pw-vermelho.png" alt="" className="marca-v marca-vermelho" />
      <img src="/marca/pw-violeta.png" alt="" className="marca-v marca-violeta" />
      <img src="/marca/pw-azul.png" alt="" className="marca-v marca-azul" />
      <img src="/marca/pw-verde.png" alt="" className="marca-v marca-verde" />
      <img src="/marca/pw-branco.png" alt="" className="marca-v marca-branco" />
      <img src="/marca/pw-preto.png" alt="" className="marca-v marca-preto" />
    </span>
  );
}

export function Logo({ grande = false }: { grande?: boolean }) {
  if (grande) {
    return (
      <span className="logo grande" role="img" aria-label="PW Express · Agilidade e segurança">
        <Marca classe="marca-grande" />
        <span className="logo-express-grande">EXPRESS</span>
      </span>
    );
  }
  return (
    <span className="logo" role="img" aria-label="PW Express">
      <Marca classe="marca-topo" />
      <span className="logo-express">Express</span>
    </span>
  );
}
