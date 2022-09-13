


function mul(vdName, factor){
print ("Salut");
	var vd = Variable.find(gameModel, vdName);
	vd.setValue(self, vd.getValue(self) * factor);
}
