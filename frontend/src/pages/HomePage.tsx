import logo from "@/assets/mindcoder.png";
import { useEffect } from "react";
import Input from "@/components/ui/Input";
import { useState } from "react";
import Button from "@/components/ui/Button";
import AlertInfo from "@/lib/AlertInfo";
import useInfoStore from "@/stores/useInfoStore";
import { useNavigate } from "react-router-dom";

function HomePage() {
  const { nickname, projectname, setNickname, setProjectname } = useInfoStore();
  const [Nickname, setNicknameState] = useState(nickname);
  const [Projectname, setProjectnameState] = useState(projectname);
  const navigate = useNavigate();

  useEffect(() => {
    setNicknameState(nickname);
    setProjectnameState(projectname);
  }, [nickname, projectname]);
  
  const changeNickname = (value) => {
    setNicknameState(value);
  };

  const changeProjectname = (value) => {
    setProjectnameState(value);
  };

  const handleClick = () => {
    if (Nickname === "" || Projectname === "") {
      AlertInfo({
        type: "destructive",
        title: "Error",
        message: "Please enter your nickname and project name",
        duration: 5000,
      });
      return;
    }
    setNickname(Nickname);
    setProjectname(Projectname);
    navigate(`/defineneeds/${Projectname}/0`);
  };

  return (
    <div className="flex items-center justify-center w-screen h-screen">
      <div className="flex flex-col md:flex-row items-center justify-center rounded-lg overflow-hidden gap-24 p-4">
        <div className="flex justify-center items-center w-full md:w-1/2 bg-gray-200 p-4">
          <img
            src={logo}
            className="max-h-[96vh] min-w-[200px] object-contain"
            alt="logo"
          />
        </div>
        <div className="flex flex-col items-center rounded-tl-[30px] rounded-tr-[30px] md:w-[50vh] md:h-[56vh] p-8 ">
          <h1 className="text-4xl font-semibold text-center mt-4 mb-8 font-zen pb-4">
            Welcome to MindCoder
          </h1>
          <div className="w-full max-w-md mb-6 relative">
            <label className="absolute z-10 -top-4 left-4 bg-[#ffffff] px-1 text-xl font-zen">
              Nickname
            </label>
            <Input
              type="text"
              placeholder="Enter your nickname"
              onChange={changeNickname}
              value={Nickname}
              className="border-gray-400 w-full p-3 rounded-md bg-[#ffffff]"
            />
          </div>
          <div className="w-full max-w-md mb-6 relative">
            <label className="absolute z-10 -top-4 left-4 bg-[#ffffff] px-1 text-xl font-zen">
              Project Name
            </label>
            <Input
              type="text"
              placeholder="Enter your project name"
              onChange={changeProjectname}
              value={Projectname}
              className="border-gray-400 w-full p-3 rounded-md bg-[#ffffff]"
            />
          </div>
          <div className="w-full max-w-md pt-4">
            <Button
              color="deep"
              className="w-full p-3 rounded-xl bg-[#D39C83] text-white "
              onClick={handleClick}
            >
              START MINDCODING
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
