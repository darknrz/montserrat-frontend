type MonsterCharacterProps = {
  src: string;
};

export function MonsterCharacter({ src }: MonsterCharacterProps) {
  return <img src={src} alt="" className="h-[220px] w-auto select-none" draggable={false} />;
}