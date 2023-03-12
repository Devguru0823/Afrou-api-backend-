#! /bin/sh

ubuntu_Version=`lsb_release -r`

# ================================================================================================================================

if [ $1 = 'unlock-install' ]
then
	ps -A | grep apt
	if pgrep "apt" > /dev/null
	then
	    echo "apt or apt-get processes are running then unlock..."
	    #sudo killall apt apt-get 
	    sudo pkill -f apt-get
	    sudo pkill -f apt
	    sudo lsof /var/lib/dpkg/lock
	    sudo lsof /var/lib/apt/lists/lock
	    sudo lsof /var/cache/apt/archives/lock
	    sudo rm /var/lib/apt/lists/lock
	    sudo rm /var/cache/apt/archives/lock
            sudo rm /var/lib/dpkg/lock
	    sudo dpkg --configure -a

	    echo "Now Sleep..."
            sleep 5s
	    echo "Re-test..."
	    sudo bash install-api.sh unlock-install
	    
	else
	    echo "There is no locking apt or apt-get processes!"
	fi
fi

# ================================================================================================================================

if [ $1 = 'install-full' ]
then
	sudo bash install-api.sh unlock-install
	sudo apt-get update && sudo apt-get upgrade
	sudo apt install make gcc libc6-dev tcl
	sudo apt-get install build-essential libssl-dev
	sudo apt-get install curl
	sudo apt-get purge nodejs
	sudo apt-get autoremove
	sudo curl -sL https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh -o install_nvm.sh
	sudo bash install_nvm.sh
	sleep 5s
	export NVM_DIR="$HOME/.nvm"
	[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
	[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
	sudo chmod 777 -R $HOME/.nvm
	nvm install 10.20.0
	nvm alias default 10.20.0
	sudo ln -s /usr/bin/nodejs /usr/sbin/node
	sudo add-apt-repository ppa:jonathonf/ffmpeg-4
	sudo apt-get update
	sudo apt-get install ffmpeg
	sudo chmod 777 -R $HOME/.nvm
	npm install compress-images
	npm install pngquant-bin
        npm install @ffmpeg-installer/ffmpeg
	npm install @ffprobe-installer/ffprobe
	npm install fluent-ffmpeg
	npm install bytenode@1.1.6
	sudo rm install_nvm.sh
fi

exit 0
