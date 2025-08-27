import { ChangeEvent } from "react";

type InputProps = {
  type: "text" | "password";
  placeholder?: string;
  onChange: (value: string) => void;
  value?: string;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean; 
};

export default function Input({
  type,
  placeholder,
  value,
  onChange,
  className,
  children,
  disabled,
}: InputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="w-full relative">
      <input
        type={type}
        placeholder={placeholder}
        className={`p-4 w-full border outline-none border-black rounded-xl ${className}`}
        value={value}
        onChange={handleChange}
        disabled={disabled} 
      />
      {children}
    </div>
  );
}
